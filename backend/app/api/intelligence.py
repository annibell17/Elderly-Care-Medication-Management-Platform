from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.care import EscalationEvent
from app.models.medication import ScheduledDose, Medication, AdherenceEvent
from app.models.user import User, ElderlyProfile
from app.schemas.care import (
    EscalationEventOut, EscalationAcknowledgeRequest, EscalationResolveRequest
)
from app.api.deps import get_current_user, get_authorized_elderly_profile, log_audit
from app.services.ml_engine import care_intelligence_engine
from app.services.scheduler import process_upcoming_reminders, process_unresolved_escalations, process_refill_checks

router = APIRouter(prefix="/intelligence", tags=["Care Intelligence Engine"])

@router.get("/analytics")
def get_adherence_analytics(
    days: int = 30,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Processes historical adherence events, calculates transparent metrics (morning, afternoon, evening),
    identifies behavioural patterns using Rule Engine & Scikit-learn, and returns contextual recommendations.
    """
    return care_intelligence_engine.calculate_adherence_analytics(db, profile.id, days=days)

@router.get("/escalations", response_model=List[EscalationEventOut])
def list_escalations(
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    escalations = db.query(EscalationEvent).filter(
        EscalationEvent.elderly_profile_id == profile.id
    ).order_by(EscalationEvent.triggered_at.desc()).all()

    results = []
    for esc in escalations:
        dose = db.query(ScheduledDose).filter(ScheduledDose.id == esc.scheduled_dose_id).first()
        med = db.query(Medication).filter(Medication.id == dose.medication_id).first() if dose else None
        ack_user = db.query(User).filter(User.id == esc.acknowledged_by_id).first() if esc.acknowledged_by_id else None
        res_user = db.query(User).filter(User.id == esc.resolved_by_id).first() if esc.resolved_by_id else None

        results.append({
            "id": esc.id,
            "scheduled_dose_id": esc.scheduled_dose_id,
            "medication_name": med.name if med else "Medication",
            "dosage_strength": med.dosage_strength if med else "",
            "scheduled_time": dose.scheduled_time if dose else esc.triggered_at,
            "stage": esc.stage,
            "status": esc.status,
            "triggered_at": esc.triggered_at,
            "acknowledged_at": esc.acknowledged_at,
            "acknowledged_by_name": ack_user.full_name if ack_user else None,
            "resolved_at": esc.resolved_at,
            "resolved_by_name": res_user.full_name if res_user else None,
            "resolution_notes": esc.resolution_notes
        })
    return results

@router.post("/escalations/{escalation_id}/acknowledge")
def acknowledge_escalation(
    escalation_id: str,
    req: EscalationAcknowledgeRequest,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Caregiver or family member acknowledges the escalation alert.
    Separate acknowledgment tracking as required.
    """
    esc = db.query(EscalationEvent).filter(
        EscalationEvent.id == escalation_id,
        EscalationEvent.elderly_profile_id == profile.id
    ).first()
    if not esc:
        raise HTTPException(status_code=404, detail="Escalation event not found")

    esc.acknowledged_at = datetime.now(timezone.utc)
    esc.acknowledged_by_id = current_user.id
    esc.status = "acknowledged"
    db.commit()

    log_audit(db, current_user.id, "ACKNOWLEDGE_ESCALATION", "escalation_event", esc.id)
    return {"success": True, "message": "Escalation alert acknowledged", "status": esc.status}

@router.post("/escalations/{escalation_id}/resolve")
def resolve_escalation(
    escalation_id: str,
    req: EscalationResolveRequest,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Caregiver records physical resolution and logs confirmation or explanation.
    """
    esc = db.query(EscalationEvent).filter(
        EscalationEvent.id == escalation_id,
        EscalationEvent.elderly_profile_id == profile.id
    ).first()
    if not esc:
        raise HTTPException(status_code=404, detail="Escalation event not found")

    now = datetime.now(timezone.utc)
    esc.resolved_at = now
    esc.resolved_by_id = current_user.id
    esc.resolution_notes = req.resolution_notes
    esc.status = "resolved"

    # Update the scheduled dose
    dose = db.query(ScheduledDose).filter(ScheduledDose.id == esc.scheduled_dose_id).first()
    if dose:
        dose.status = req.dose_status
        dose.confirmed_at = now
        dose.confirmed_by_id = current_user.id
        dose.confirmation_method = req.confirmation_method
        dose.notes = f"Resolved via Care Escalation: {req.resolution_notes}"

        # Record Adherence event
        adh = AdherenceEvent(
            scheduled_dose_id=dose.id,
            elderly_profile_id=profile.id,
            status=req.dose_status,
            recorded_at=now,
            recorded_by_id=current_user.id,
            recorded_by_role=current_user.role,
            confirmation_type=req.confirmation_method,
            notes=req.resolution_notes
        )
        db.add(adh)

        # Decrement medication inventory if taken
        if req.dose_status in ["taken", "delayed"]:
            med = db.query(Medication).filter(Medication.id == dose.medication_id).first()
            if med and med.quantity_remaining > 0:
                med.quantity_remaining -= 1

    db.commit()
    log_audit(db, current_user.id, "RESOLVE_ESCALATION", "escalation_event", esc.id, {"resolution": req.resolution_notes})
    return {"success": True, "message": "Escalation successfully resolved", "status": esc.status}

@router.post("/trigger-loop-cycle")
def trigger_care_loop_cycle(
    db: Session = Depends(get_db)
):
    """
    Triggers an on-demand Care Intelligence Loop cycle for live hackathon demos:
    1. Checks upcoming dose reminders
    2. Identifies unconfirmed doses and evaluates escalation stages
    3. Runs refill evaluations
    """
    process_upcoming_reminders()
    process_unresolved_escalations()
    process_refill_checks()
    return {
        "success": True,
        "message": "Care Intelligence Loop executed successfully. Doses evaluated, escalations checked, and notifications dispatched.",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
