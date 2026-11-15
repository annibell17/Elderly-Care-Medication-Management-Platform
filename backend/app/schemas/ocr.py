from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class ExtractedMedicationDraft(BaseModel):
    name: str
    dosage_strength: str
    frequency_type: str = "daily"
    scheduled_times: List[str] = ["08:00"]
    form: str = "tablet"
    purpose: Optional[str] = None
    instructions: Optional[str] = None
    quantity: int = 30
    refill_threshold: int = 7
    confidence: float = 0.85

class OCRParseResponse(BaseModel):
    doctor_name: str
    prescription_date: str
    raw_text: str
    extracted_medications: List[ExtractedMedicationDraft]
    confidence_score: float
    manual_verification_required: bool
    verification_notice: str

class ActivateDraftMedicationRequest(BaseModel):
    medication: ExtractedMedicationDraft
