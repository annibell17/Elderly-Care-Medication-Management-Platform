from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class DoctorBase(BaseModel):
    name: str
    specialization: str
    clinic_hospital: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class DoctorCreate(DoctorBase):
    pass

class DoctorOut(DoctorBase):
    id: str
    elderly_profile_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class AppointmentBase(BaseModel):
    doctor_id: str
    appointment_date: datetime
    duration_minutes: int = 30
    location_type: str = "in_person"  # in_person, telehealth
    location_details: Optional[str] = None
    reason_for_visit: str
    notes: Optional[str] = None
    accompanying_caregiver_id: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    doctor_id: Optional[str] = None
    appointment_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location_type: Optional[str] = None
    location_details: Optional[str] = None
    reason_for_visit: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    accompanying_caregiver_id: Optional[str] = None
    caregiver_attendance_status: Optional[str] = None
    share_briefing_with_doctor: Optional[bool] = None

class PreAppointmentBriefingOut(BaseModel):
    appointment_id: str
    doctor_name: str
    doctor_specialization: str
    appointment_date: datetime
    reason_for_visit: str
    active_medications: List[Dict[str, Any]]
    recent_adherence_rate: float
    recent_missed_or_unconfirmed_doses: List[Dict[str, Any]]
    recent_caregiver_observations: List[Dict[str, Any]]
    previous_appointment_notes: Optional[str] = None
    patient_prepared_questions: List[str] = []
    generated_at: datetime
    share_with_doctor_authorized: bool

class AppointmentOut(AppointmentBase):
    id: str
    elderly_profile_id: str
    status: str
    caregiver_attendance_status: str
    pre_briefing_generated: bool
    pre_briefing_data: Dict[str, Any] = {}
    share_briefing_with_doctor: bool
    doctor: Optional[DoctorOut] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
