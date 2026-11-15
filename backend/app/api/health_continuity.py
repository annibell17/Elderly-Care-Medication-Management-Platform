from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, ElderlyProfile
from app.models.medication import Medication, ScheduledDose, AdherenceEvent
from app.models.appointment import Appointment, Doctor
from app.models.care import CaregiverLog, HealthObservation, EscalationEvent
from app.models.document import MedicalDocument
from app.schemas.user import ElderlyProfileUpdate, ElderlyProfileOut
from app.api.deps import get_current_user, get_authorized_elderly_profile, verify_permission, log_audit
import os, shutil
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter(prefix="/health", tags=["Health Continuity"])

class NotificationPreferencesUpdate(BaseModel):
    email_enabled: bool = True
    lead_time_minutes: int = 15
    escalation_notifications: bool = True
    refill_alerts: bool = True
    appointment_reminders: bool = True

@router.get("/profile", response_model=ElderlyProfileOut)
def get_elderly_profile(
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user)
):
    return profile

@router.put("/profile", response_model=ElderlyProfileOut)
def update_elderly_profile(
    update_in: ElderlyProfileUpdate,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly":
        raise HTTPException(status_code=403, detail="Only the elderly individual can update profile details")

    for field, val in update_in.model_dump().items():
        setattr(profile, field, val)

    db.commit()
    db.refresh(profile)
    log_audit(db, current_user.id, "UPDATE_HEALTH_PROFILE", "elderly_profile", profile.id)
    return profile

@router.get("/preferences")
def get_notification_preferences(
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user)
):
    return profile.notification_preferences or {
        "email_enabled": True,
        "lead_time_minutes": 15,
        "escalation_notifications": True,
        "refill_alerts": True,
        "appointment_reminders": True
    }

@router.put("/preferences")
def update_notification_preferences(
    prefs: NotificationPreferencesUpdate,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly":
        raise HTTPException(status_code=403, detail="Only the elderly individual can configure notification preferences")

    profile.notification_preferences = prefs.model_dump()
    db.commit()
    log_audit(db, current_user.id, "UPDATE_NOTIFICATION_PREFERENCES", "elderly_profile", profile.id)
    return {"success": True, "preferences": profile.notification_preferences}

@router.get("/timeline")
def get_health_timeline(
    limit: int = 40,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Enforce permission
    if current_user.role != "elderly" and not verify_permission("can_view_health_records", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission denied: You do not have permission to view health records or timeline.")

    timeline_items = []

    # 1. Medications
    meds = db.query(Medication).filter(Medication.elderly_profile_id == profile.id).all()
    for m in meds:
        timeline_items.append({
            "type": "medication_prescribed",
            "title": f"Started {m.name} ({m.dosage_strength})",
            "description": f"Form: {m.form.title()}. Purpose: {m.purpose or 'Not specified'}. Instructions: {m.instructions or 'None'}",
            "timestamp": m.created_at,
            "badge_color": "teal",
            "category": "Medication"
        })
        if m.is_discontinued and m.discontinued_at:
            timeline_items.append({
                "type": "medication_discontinued",
                "title": f"Discontinued {m.name}",
                "description": f"Reason: {m.discontinued_reason or 'Doctor order'}",
                "timestamp": m.discontinued_at,
                "badge_color": "rose",
                "category": "Medication"
            })

    # 2. Appointments
    appts = db.query(Appointment).filter(Appointment.elderly_profile_id == profile.id).all()
    for a in appts:
        doc = db.query(Doctor).filter(Doctor.id == a.doctor_id).first()
        doc_name = doc.name if doc else "Doctor"
        timeline_items.append({
            "type": "appointment",
            "title": f"Appointment with {doc_name} ({doc.specialization if doc else 'General'})",
            "description": f"Reason: {a.reason_for_visit}. Status: {a.status.title()}. Location: {a.location_type.replace('_', ' ').title()}",
            "timestamp": a.appointment_date,
            "badge_color": "blue",
            "category": "Clinical"
        })

    # 3. Observations
    observations = db.query(HealthObservation).filter(HealthObservation.elderly_profile_id == profile.id).all()
    for o in observations:
        u = db.query(User).filter(User.id == o.author_id).first()
        timeline_items.append({
            "type": "observation",
            "title": f"Observation: {o.title}",
            "description": f"{o.description} (Recorded by {u.full_name if u else 'Caregiver'})",
            "timestamp": o.recorded_at,
            "badge_color": "amber" if o.severity == "medium" else "rose" if o.severity == "high" else "teal",
            "category": "Care Observation"
        })

    # 4. Caregiver Handover Logs
    logs = db.query(CaregiverLog).filter(CaregiverLog.elderly_profile_id == profile.id).all()
    for l in logs:
        u = db.query(User).filter(User.id == l.author_id).first()
        timeline_items.append({
            "type": "handover_log",
            "title": f"{l.shift_type.title()} Shift Care Handover",
            "description": f"Vitals: BP {l.blood_pressure or 'N/A'}, Pulse {l.heart_rate or 'N/A'} bpm. Mood: {l.mood.title()}. {l.handover_notes or ''}",
            "timestamp": l.created_at,
            "badge_color": "indigo",
            "category": "Care Handover"
        })

    # 5. Escalations
    escalations = db.query(EscalationEvent).filter(EscalationEvent.elderly_profile_id == profile.id).all()
    for e in escalations:
        dose = db.query(ScheduledDose).filter(ScheduledDose.id == e.scheduled_dose_id).first()
        med = db.query(Medication).filter(Medication.id == dose.medication_id).first() if dose else None
        timeline_items.append({
            "type": "care_escalation",
            "title": f"Stage {e.stage} Alert: {med.name if med else 'Medication'}",
            "description": f"Status: {e.status.title()}. Resolution: {e.resolution_notes or 'Pending review'}",
            "timestamp": e.triggered_at,
            "badge_color": "purple",
            "category": "Escalation"
        })

    timeline_items.sort(key=lambda x: x["timestamp"], reverse=True)
    return timeline_items[:limit]

@router.get("/summary-report")
def get_health_summary_report(
    days: int = 30,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_view_health_records", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission denied: You do not have permission to generate health reports.")

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    elderly_user = db.query(User).filter(User.id == profile.user_id).first()

    meds = db.query(Medication).filter(Medication.elderly_profile_id == profile.id).all()
    active_meds = [m for m in meds if not m.is_discontinued]
    discontinued_meds = [m for m in meds if m.is_discontinued]

    doses = db.query(ScheduledDose).join(Medication).filter(
        Medication.elderly_profile_id == profile.id,
        ScheduledDose.scheduled_time >= cutoff
    ).all()
    total_doses = len(doses)
    taken_doses = sum(1 for d in doses if d.status in ["taken", "delayed"])
    adherence_pct = round((taken_doses / total_doses * 100), 1) if total_doses > 0 else 100.0

    appts = db.query(Appointment).filter(
        Appointment.elderly_profile_id == profile.id,
        Appointment.appointment_date >= cutoff
    ).order_by(Appointment.appointment_date.desc()).all()
    appt_list = []
    for a in appts:
        doc = db.query(Doctor).filter(Doctor.id == a.doctor_id).first()
        appt_list.append({
            "doctor": doc.name if doc else "Doctor",
            "specialization": doc.specialization if doc else "General",
            "date": a.appointment_date.strftime("%Y-%m-%d %H:%M"),
            "reason": a.reason_for_visit,
            "status": a.status
        })

    recent_logs = db.query(CaregiverLog).filter(
        CaregiverLog.elderly_profile_id == profile.id,
        CaregiverLog.created_at >= cutoff
    ).order_by(CaregiverLog.created_at.desc()).limit(7).all()
    vitals_history = [{
        "date": l.date,
        "blood_pressure": l.blood_pressure,
        "heart_rate": l.heart_rate,
        "blood_sugar": l.blood_sugar,
        "mood": l.mood
    } for l in recent_logs if l.blood_pressure or l.heart_rate]

    report = {
        "report_id": f"REP-{profile.id[:8].upper()}-{datetime.now().strftime('%Y%m%d')}",
        "generated_at": datetime.now(timezone.utc).strftime("%B %d, %Y %H:%M UTC"),
        "reporting_period_days": days,
        "patient": {
            "full_name": elderly_user.full_name if elderly_user else "Patient",
            "date_of_birth": profile.date_of_birth or "Not recorded",
            "blood_type": profile.blood_type or "Unknown",
            "primary_language": profile.primary_language,
            "emergency_contact": {
                "name": profile.emergency_contact_name,
                "phone": profile.emergency_contact_phone,
                "relation": profile.emergency_contact_relation
            },
            "allergies": profile.allergies or [],
            "chronic_conditions": profile.chronic_conditions or []
        },
        "medication_continuity": {
            "active_count": len(active_meds),
            "active_medications": [{
                "name": m.name,
                "dosage": m.dosage_strength,
                "form": m.form,
                "purpose": m.purpose,
                "instructions": m.instructions,
                "remaining": m.quantity_remaining
            } for m in active_meds],
            "discontinued_count": len(discontinued_meds),
            "discontinued_medications": [{
                "name": m.name,
                "dosage": m.dosage_strength,
                "reason": m.discontinued_reason,
                "discontinued_date": m.discontinued_at.strftime("%Y-%m-%d") if m.discontinued_at else "Historical"
            } for m in discontinued_meds]
        },
        "adherence_summary": {
            "total_doses_scheduled": total_doses,
            "confirmed_taken": taken_doses,
            "overall_adherence_rate": adherence_pct,
            "missed_or_unconfirmed": total_doses - taken_doses
        },
        "clinical_appointments": appt_list,
        "vitals_and_caregiver_observations": vitals_history,
        "notes": "CareCircle Health Continuity Record - Generated with patient consent."
    }

    log_audit(db, current_user.id, "GENERATE_HEALTH_REPORT", "elderly_profile", profile.id)
    return report

@router.get("/documents")
def list_documents(
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_view_health_records", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission denied: You do not have permission to view medical documents.")

    docs = db.query(MedicalDocument).filter(
        MedicalDocument.elderly_profile_id == profile.id
    ).order_by(MedicalDocument.uploaded_at.desc()).all()

    return [{
        "id": d.id,
        "title": d.title,
        "document_type": d.document_type,
        "file_name": d.file_name,
        "file_size": d.file_size,
        "mime_type": d.mime_type,
        "ocr_confidence": d.ocr_confidence,
        "uploaded_at": d.uploaded_at
    } for d in docs]
