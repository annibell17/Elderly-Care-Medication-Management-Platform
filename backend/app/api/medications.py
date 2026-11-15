from datetime import datetime, date, time, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.medication import Medication, MedicationSchedule, ScheduledDose, AdherenceEvent
from app.models.user import User, ElderlyProfile
from app.schemas.medication import (
    MedicationCreate, MedicationUpdate, MedicationOut,
    DiscontinueMedicationRequest, ScheduledDoseOut, DoseConfirmRequest, AdherenceEventOut
)
from app.api.deps import get_current_user, get_authorized_elderly_profile, verify_permission, log_audit
from app.services.email_service import email_service

router = APIRouter(prefix="/medications", tags=["Medication Intelligence"])

def generate_doses_for_schedule(db: Session, medication: Medication, schedule: MedicationSchedule, days_ahead: int = 7):
    """
    Generates scheduled dose records for the next specified days based on recurring schedule rules.
    """
    today = datetime.now(timezone.utc).date()
    start_d = datetime.strptime(schedule.start_date, "%Y-%m-%d").date() if schedule.start_date else today
    end_d = datetime.strptime(schedule.end_date, "%Y-%m-%d").date() if schedule.end_date else (today + timedelta(days=days_ahead))
    
    max_date = min(today + timedelta(days=days_ahead), end_d)
    curr = max(today, start_d)
    
    while curr <= max_date:
        if curr.weekday() in (schedule.days_of_week or [0, 1, 2, 3, 4, 5, 6]):
            for t_str in (schedule.scheduled_times or ["08:00"]):
                try:
                    parts = t_str.split(":")
                    dose_time = datetime.combine(curr, time(int(parts[0]), int(parts[1]))).replace(tzinfo=timezone.utc)
                    
                    existing = db.query(ScheduledDose).filter(
                        ScheduledDose.medication_id == medication.id,
                        ScheduledDose.scheduled_time == dose_time
                    ).first()
                    
                    if not existing:
                        hour = int(parts[0])
                        label = "Morning Dose" if hour < 12 else "Afternoon Dose" if hour < 17 else "Evening Dose" if hour < 21 else "Bedtime Dose"
                        dose = ScheduledDose(
                            medication_id=medication.id,
                            schedule_id=schedule.id,
                            scheduled_time=dose_time,
                            dose_label=f"{label} ({t_str})",
                            dosage_amount=medication.dosage_strength,
                            status="scheduled"
                        )
                        db.add(dose)
                except Exception:
                    pass
        curr += timedelta(days=1)
    db.commit()

@router.get("", response_model=List[MedicationOut])
def list_medications(
    include_discontinued: bool = False,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Enforce granular permission
    if current_user.role != "elderly" and not verify_permission("can_view_medications", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission denied: You do not have permission to view medications.")

    query = db.query(Medication).filter(Medication.elderly_profile_id == profile.id)
    if not include_discontinued:
        query = query.filter(Medication.is_discontinued == False)
    return query.order_by(Medication.name.asc()).all()

@router.post("", response_model=MedicationOut)
def create_medication(
    med_in: MedicationCreate,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_manage_schedules", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission required to manage medication schedules")

    med = Medication(
        elderly_profile_id=profile.id,
        name=med_in.name,
        generic_name=med_in.generic_name,
        dosage_strength=med_in.dosage_strength,
        form=med_in.form,
        color_code=med_in.color_code,
        purpose=med_in.purpose,
        instructions=med_in.instructions,
        quantity_remaining=med_in.quantity_remaining,
        refill_threshold=med_in.refill_threshold,
        total_prescribed=med_in.total_prescribed,
        prescribing_doctor_id=med_in.prescribing_doctor_id
    )
    db.add(med)
    db.commit()
    db.refresh(med)

    sched_in = med_in.initial_schedule or MedicationScheduleCreate(
        frequency_type="daily",
        scheduled_times=["08:00"],
        start_date=datetime.now(timezone.utc).strftime("%Y-%m-%d")
    )
    schedule = MedicationSchedule(
        medication_id=med.id,
        frequency_type=sched_in.frequency_type,
        scheduled_times=sched_in.scheduled_times,
        start_date=sched_in.start_date,
        end_date=sched_in.end_date,
        days_of_week=sched_in.days_of_week,
        reminder_minutes_before=sched_in.reminder_minutes_before
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    generate_doses_for_schedule(db, med, schedule, days_ahead=7)
    log_audit(db, current_user.id, "CREATE_MEDICATION", "medication", med.id, {"name": med.name})
    db.refresh(med)
    return med

@router.put("/{medication_id}", response_model=MedicationOut)
def update_medication(
    medication_id: str,
    update_data: MedicationUpdate,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_manage_schedules", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission required to update medications")

    med = db.query(Medication).filter(
        Medication.id == medication_id,
        Medication.elderly_profile_id == profile.id
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    for field, val in update_data.model_dump(exclude_unset=True).items():
        setattr(med, field, val)

    db.commit()
    db.refresh(med)
    log_audit(db, current_user.id, "UPDATE_MEDICATION", "medication", med.id)
    return med

@router.post("/{medication_id}/discontinue", response_model=MedicationOut)
def discontinue_medication(
    medication_id: str,
    req: DiscontinueMedicationRequest,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_manage_schedules", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission required to discontinue medications")

    med = db.query(Medication).filter(
        Medication.id == medication_id,
        Medication.elderly_profile_id == profile.id
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    med.is_discontinued = True
    med.discontinued_reason = req.reason
    med.discontinued_at = datetime.now(timezone.utc)

    now = datetime.now(timezone.utc)
    db.query(ScheduledDose).filter(
        ScheduledDose.medication_id == med.id,
        ScheduledDose.scheduled_time > now,
        ScheduledDose.status == "scheduled"
    ).update({"status": "skipped", "notes": f"Medication discontinued: {req.reason}"})

    db.commit()
    db.refresh(med)
    log_audit(db, current_user.id, "DISCONTINUE_MEDICATION", "medication", med.id, {"reason": req.reason})
    return med

@router.get("/today", response_model=List[ScheduledDoseOut])
def get_today_schedule(
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Enforce granular permission
    if current_user.role != "elderly" and not verify_permission("can_view_medications", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission denied: You do not have permission to view medication schedules.")

    now = datetime.now(timezone.utc)
    start_of_day = datetime.combine(now.date(), time.min).replace(tzinfo=timezone.utc)
    end_of_day = datetime.combine(now.date(), time.max).replace(tzinfo=timezone.utc)

    doses = db.query(ScheduledDose).join(Medication).filter(
        Medication.elderly_profile_id == profile.id,
        ScheduledDose.scheduled_time >= start_of_day,
        ScheduledDose.scheduled_time <= end_of_day
    ).order_by(ScheduledDose.scheduled_time.asc()).all()

    results = []
    for d in doses:
        results.append({
            "id": d.id,
            "medication_id": d.medication_id,
            "medication_name": d.medication.name,
            "dosage_strength": d.medication.dosage_strength,
            "color_code": d.medication.color_code,
            "instructions": d.medication.instructions,
            "scheduled_time": d.scheduled_time,
            "dose_label": d.dose_label,
            "status": d.status,
            "dosage_amount": d.dosage_amount,
            "reminder_sent_at": d.reminder_sent_at,
            "confirmed_at": d.confirmed_at,
            "confirmation_method": d.confirmation_method,
            "notes": d.notes,
            "escalation_level": d.escalation_level
        })
    return results

@router.post("/doses/{dose_id}/confirm")
def confirm_dose(
    dose_id: str,
    req: DoseConfirmRequest,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_confirm_medications", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission required to confirm medication intake")

    dose = db.query(ScheduledDose).filter(ScheduledDose.id == dose_id).first()
    if not dose:
        raise HTTPException(status_code=404, detail="Scheduled dose not found")

    medication = db.query(Medication).filter(Medication.id == dose.medication_id).first()
    if not medication or medication.elderly_profile_id != profile.id:
        raise HTTPException(status_code=403, detail="Not authorized for this medication dose")

    now = datetime.now(timezone.utc)
    delay_minutes = max(0, int((now - dose.scheduled_time).total_seconds() / 60)) if req.status == "taken" else 0

    conf_type = "verified_physical" if current_user.role == "caretaker" else "self_reported"

    dose.status = req.status
    dose.confirmed_at = now
    dose.confirmed_by_id = current_user.id
    dose.confirmation_method = req.confirmation_method
    dose.notes = req.notes

    adherence_event = AdherenceEvent(
        scheduled_dose_id=dose.id,
        elderly_profile_id=profile.id,
        status=req.status,
        recorded_at=now,
        recorded_by_id=current_user.id,
        recorded_by_role=current_user.role,
        confirmation_type=conf_type,
        delay_minutes=delay_minutes,
        notes=req.notes
    )
    db.add(adherence_event)

    if req.status in ["taken", "delayed"] and medication.quantity_remaining > 0:
        medication.quantity_remaining -= 1
        
        if medication.quantity_remaining <= medication.refill_threshold:
            elderly_user = db.query(User).filter(User.id == profile.user_id).first()
            if elderly_user:
                email_service.send_notification_email(
                    to_email=elderly_user.email,
                    subject=f"CareCircle Refill Alert: {medication.name} is running low",
                    title=f"Refill Needed: {medication.name}",
                    subtitle=f"{medication.quantity_remaining} doses remaining (threshold: {medication.refill_threshold})",
                    body_html=f"<p>Hello {elderly_user.full_name},</p><p>You have {medication.quantity_remaining} doses of {medication.name} left. Please arrange a refill soon.</p>",
                    notification_type="refill_alert",
                    user_id=elderly_user.id,
                    elderly_profile_id=profile.id
                )

    db.commit()
    log_audit(db, current_user.id, "CONFIRM_DOSE", "scheduled_dose", dose.id, {"status": req.status, "method": req.confirmation_method})

    return {
        "success": True,
        "dose_id": dose.id,
        "status": dose.status,
        "confirmed_at": dose.confirmed_at,
        "remaining_quantity": medication.quantity_remaining
    }
