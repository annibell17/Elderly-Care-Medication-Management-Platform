import os
import shutil
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, ElderlyProfile
from app.models.medication import Medication, MedicationSchedule, ScheduledDose
from app.models.document import MedicalDocument
from app.schemas.ocr import OCRParseResponse, ActivateDraftMedicationRequest
from app.schemas.medication import MedicationOut, MedicationScheduleCreate
from app.api.deps import get_current_user, get_authorized_elderly_profile, verify_permission, log_audit
from app.services.ocr_engine import prescription_ocr_engine
from app.api.medications import generate_doses_for_schedule

router = APIRouter(prefix="/ocr", tags=["Prescription OCR"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}

def validate_magic_bytes(header: bytes, ext: str) -> bool:
    """Validates binary file signature to prevent executable upload disguises."""
    if ext == ".pdf":
        return header.startswith(b"%PDF-")
    elif ext == ".png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    elif ext in {".jpg", ".jpeg"}:
        return header.startswith(b"\xff\xd8\xff")
    elif ext == ".webp":
        return len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WEBP"
    return True

@router.post("/upload-prescription", response_model=OCRParseResponse)
async def upload_prescription_ocr(
    file: UploadFile = File(...),
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uploads a prescription image (PNG/JPG) or PDF with secure restrictions:
    - Max 10MB file size limit
    - Allowed extension whitelist
    - Binary magic byte validation
    - Sanitized UUID storage
    - Never automatically activates regimens without manual verification.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")

    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: PDF, PNG, JPG, JPEG, WEBP."
        )

    # Read first 16 bytes for magic number validation
    header_bytes = await file.read(16)
    if not validate_magic_bytes(header_bytes, file_ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match the declared extension format."
        )

    # Read rest of file with size cap check
    rest_bytes = await file.read(MAX_FILE_SIZE + 1)
    file_bytes = header_bytes + rest_bytes
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds maximum allowed limit of 10 MB."
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_filename = f"rx_{profile.id[:8]}_{uuid.uuid4().hex[:12]}{file_ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(dest_path, "wb") as buffer:
        buffer.write(file_bytes)

    file_size = len(file_bytes)

    # Run OCR extraction
    raw_text = prescription_ocr_engine.extract_text_from_file(dest_path, file.content_type)
    parsed_result = prescription_ocr_engine.parse_prescription_text(raw_text)

    # Save to MedicalDocument database table
    doc = MedicalDocument(
        elderly_profile_id=profile.id,
        uploaded_by_id=current_user.id,
        title=f"Prescription - {parsed_result['doctor_name']} ({parsed_result['prescription_date']})",
        document_type="prescription",
        file_path=dest_path,
        file_name=os.path.basename(file.filename),
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        ocr_extracted_text=raw_text,
        ocr_parsed_data=parsed_result,
        ocr_confidence=parsed_result["confidence_score"]
    )
    db.add(doc)
    db.commit()

    log_audit(db, current_user.id, "UPLOAD_PRESCRIPTION_OCR", "medical_document", doc.id, {
        "filename": os.path.basename(file.filename),
        "confidence": parsed_result["confidence_score"]
    })

    return parsed_result

@router.post("/activate-draft", response_model=MedicationOut)
def activate_draft_medication(
    req: ActivateDraftMedicationRequest,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    User reviews and confirms the extracted prescription draft in an editable confirmation form.
    Only then is the medication and recurring schedule activated!
    """
    if current_user.role != "elderly" and not verify_permission("can_manage_schedules", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission required to activate medications")

    draft = req.medication

    med = Medication(
        elderly_profile_id=profile.id,
        name=draft.name,
        dosage_strength=draft.dosage_strength,
        form=draft.form,
        purpose=draft.purpose or "Prescription Management",
        instructions=draft.instructions or "Take as prescribed",
        quantity_remaining=draft.quantity,
        refill_threshold=draft.refill_threshold,
        total_prescribed=draft.quantity
    )
    db.add(med)
    db.commit()
    db.refresh(med)

    from datetime import datetime, timezone
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    schedule = MedicationSchedule(
        medication_id=med.id,
        frequency_type=draft.frequency_type,
        scheduled_times=draft.scheduled_times or ["08:00"],
        start_date=today_str,
        days_of_week=[0, 1, 2, 3, 4, 5, 6],
        reminder_minutes_before=15
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    generate_doses_for_schedule(db, med, schedule, days_ahead=7)
    db.refresh(med)

    log_audit(db, current_user.id, "ACTIVATE_OCR_MEDICATION", "medication", med.id, {"name": med.name})
    return med
