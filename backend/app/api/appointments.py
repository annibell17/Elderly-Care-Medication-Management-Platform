from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.appointment import Doctor, Appointment
from app.models.medication import Medication, ScheduledDose, AdherenceEvent
from app.models.care import CaregiverLog, HealthObservation
from app.models.user import User, ElderlyProfile
from app.schemas.appointment import (
    DoctorCreate, DoctorOut, AppointmentCreate, AppointmentUpdate, AppointmentOut,
    PreAppointmentBriefingOut
)
from app.api.deps import get_current_user, get_authorized_elderly_profile, verify_permission, log_audit

router = APIRouter(prefix="/appointments", tags=["Appointment Management"])

# Doctors
@router.get("/doctors", response_model=List[DoctorOut])
def list_doctors(
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_view_appointments", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission denied: You do not have permission to view doctors or appointments.")
    return db.query(Doctor).filter(Doctor.elderly_profile_id == profile.id).all()

@router.post("/doctors", response_model=DoctorOut)
def create_doctor(
    doc_in: DoctorCreate,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_schedule_appointments", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission required to add doctors")

    doc = Doctor(
        elderly_profile_id=profile.id,
        name=doc_in.name,
        specialization=doc_in.specialization,
        clinic_hospital=doc_in.clinic_hospital,
        phone=doc_in.phone,
        email=doc_in.email,
        address=doc_in.address,
        notes=doc_in.notes
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    log_audit(db, current_user.id, "CREATE_DOCTOR", "doctor", doc.id)
    return doc

# Appointments
@router.get("", response_model=List[AppointmentOut])
def list_appointments(
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_view_appointments", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission denied: You do not have permission to view appointments.")

    return db.query(Appointment).filter(Appointment.elderly_profile_id == profile.id).order_by(Appointment.appointment_date.asc()).all()

@router.post("", response_model=AppointmentOut)
def create_appointment(
    appt_in: AppointmentCreate,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_schedule_appointments", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission required to schedule appointments")

    appt = Appointment(
        elderly_profile_id=profile.id,
        doctor_id=appt_in.doctor_id,
        appointment_date=appt_in.appointment_date,
        duration_minutes=appt_in.duration_minutes,
        location_type=appt_in.location_type,
        location_details=appt_in.location_details,
        reason_for_visit=appt_in.reason_for_visit,
        notes=appt_in.notes,
        accompanying_caregiver_id=appt_in.accompanying_caregiver_id,
        caregiver_attendance_status="confirmed" if appt_in.accompanying_caregiver_id else "requested"
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    log_audit(db, current_user.id, "CREATE_APPOINTMENT", "appointment", appt.id)
    return appt

@router.put("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: str,
    update_in: AppointmentUpdate,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_schedule_appointments", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission required to update appointments")

    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.elderly_profile_id == profile.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    for field, val in update_in.model_dump(exclude_unset=True).items():
        setattr(appt, field, val)

    db.commit()
    db.refresh(appt)
    log_audit(db, current_user.id, "UPDATE_APPOINTMENT", "appointment", appt.id)
    return appt

@router.delete("/{appointment_id}")
def cancel_appointment(
    appointment_id: str,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_schedule_appointments", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission required to cancel appointments")

    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.elderly_profile_id == profile.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = "cancelled"
    db.commit()
    log_audit(db, current_user.id, "CANCEL_APPOINTMENT", "appointment", appt.id)
    return {"success": True, "message": "Appointment cancelled successfully"}

@router.get("/{appointment_id}/pre-briefing", response_model=PreAppointmentBriefingOut)
def generate_pre_appointment_briefing(
    appointment_id: str,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_view_health_records", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission denied: You do not have permission to view clinical health briefings.")

    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.elderly_profile_id == profile.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    doctor = db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()

    meds = db.query(Medication).filter(
        Medication.elderly_profile_id == profile.id,
        Medication.is_discontinued == False
    ).all()
    active_meds_list = [{
        "name": m.name,
        "dosage": m.dosage_strength,
        "form": m.form,
        "purpose": m.purpose,
        "instructions": m.instructions
    } for m in meds]

    two_weeks_ago = datetime.now(timezone.utc) - timedelta(days=14)
    past_doses = db.query(ScheduledDose).join(Medication).filter(
        Medication.elderly_profile_id == profile.id,
        ScheduledDose.scheduled_time >= two_weeks_ago,
        ScheduledDose.scheduled_time <= datetime.now(timezone.utc)
    ).all()
    
    total_doses = len(past_doses)
    taken_doses = sum(1 for d in past_doses if d.status in ["taken", "delayed"])
    adherence_pct = round((taken_doses / total_doses * 100), 1) if total_doses > 0 else 100.0

    missed_doses = [{
        "medication_name": d.medication.name,
        "scheduled_time": d.scheduled_time.strftime("%b %d, %I:%M %p"),
        "status": d.status,
        "notes": d.notes
    } for d in past_doses if d.status in ["missed", "unconfirmed", "skipped"]][:5]

    observations = db.query(HealthObservation).filter(
        HealthObservation.elderly_profile_id == profile.id,
        HealthObservation.recorded_at >= two_weeks_ago
    ).order_by(HealthObservation.recorded_at.desc()).limit(5).all()

    obs_list = [{
        "title": o.title,
        "description": o.description,
        "severity": o.severity,
        "date": o.recorded_at.strftime("%b %d")
    } for o in observations]

    prepared_questions = [
        f"Are there any side effects from taking {meds[0].name if meds else 'my medications'} together?",
        "Should we adjust my dosage based on my recent blood pressure readings?",
        "Can I resume light morning walking or yoga exercises?"
    ]

    briefing_data = {
        "appointment_id": appt.id,
        "doctor_name": doctor.name if doctor else "Doctor",
        "doctor_specialization": doctor.specialization if doctor else "General",
        "appointment_date": appt.appointment_date,
        "reason_for_visit": appt.reason_for_visit,
        "active_medications": active_meds_list,
        "recent_adherence_rate": adherence_pct,
        "recent_missed_or_unconfirmed_doses": missed_doses,
        "recent_caregiver_observations": obs_list,
        "previous_appointment_notes": appt.notes or "Routine check-up; general vitals stable.",
        "patient_prepared_questions": prepared_questions,
        "generated_at": datetime.now(timezone.utc),
        "share_with_doctor_authorized": appt.share_briefing_with_doctor
    }

    appt.pre_briefing_generated = True
    appt.pre_briefing_data = {
        "adherence_rate": adherence_pct,
        "active_med_count": len(active_meds_list),
        "missed_doses_count": len(missed_doses),
        "summary": f"{len(active_meds_list)} active meds, {adherence_pct}% adherence over last 14 days."
    }
    db.commit()

    return briefing_data

@router.post("/{appointment_id}/toggle-share")
def toggle_share_briefing(
    appointment_id: str,
    share: bool,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly":
        raise HTTPException(status_code=403, detail="Only the elderly individual can authorize doctor briefing sharing")

    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.elderly_profile_id == profile.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.share_briefing_with_doctor = share
    db.commit()
    log_audit(db, current_user.id, "TOGGLE_DOCTOR_SHARE", "appointment", appt.id, {"share": share})
    return {"success": True, "share_briefing_with_doctor": appt.share_briefing_with_doctor}
