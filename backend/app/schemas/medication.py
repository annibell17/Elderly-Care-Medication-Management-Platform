from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class MedicationBase(BaseModel):
    name: str
    generic_name: Optional[str] = None
    dosage_strength: str
    form: str = "tablet"  # tablet, capsule, liquid, drops, inhaler, injection
    color_code: str = "#0D9488"
    purpose: Optional[str] = None
    instructions: Optional[str] = None
    quantity_remaining: int = 30
    refill_threshold: int = 7
    total_prescribed: int = 30
    prescribing_doctor_id: Optional[str] = None

class MedicationScheduleCreate(BaseModel):
    frequency_type: str = "daily"  # daily, twice_daily, thrice_daily, as_needed, custom_days
    scheduled_times: List[str] = ["08:00"]  # e.g., ["08:00", "20:00"]
    start_date: str  # "YYYY-MM-DD"
    end_date: Optional[str] = None
    days_of_week: List[int] = [0, 1, 2, 3, 4, 5, 6]
    reminder_minutes_before: int = 15

class MedicationCreate(MedicationBase):
    initial_schedule: Optional[MedicationScheduleCreate] = None

class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    dosage_strength: Optional[str] = None
    form: Optional[str] = None
    color_code: Optional[str] = None
    purpose: Optional[str] = None
    instructions: Optional[str] = None
    quantity_remaining: Optional[int] = None
    refill_threshold: Optional[int] = None
    total_prescribed: Optional[int] = None

class DiscontinueMedicationRequest(BaseModel):
    reason: str

class MedicationScheduleOut(BaseModel):
    id: str
    medication_id: str
    frequency_type: str
    scheduled_times: List[str]
    start_date: str
    end_date: Optional[str] = None
    days_of_week: List[int]
    reminder_minutes_before: int
    is_active: bool

    class Config:
        from_attributes = True

class MedicationOut(MedicationBase):
    id: str
    elderly_profile_id: str
    is_discontinued: bool
    discontinued_reason: Optional[str] = None
    discontinued_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    schedules: List[MedicationScheduleOut] = []

    class Config:
        from_attributes = True

class ScheduledDoseOut(BaseModel):
    id: str
    medication_id: str
    medication_name: str
    dosage_strength: str
    color_code: str
    instructions: Optional[str] = None
    scheduled_time: datetime
    dose_label: str
    status: str  # scheduled, reminder_sent, taken, delayed, missed, skipped, unconfirmed
    dosage_amount: Optional[str] = None
    reminder_sent_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    confirmation_method: Optional[str] = None
    notes: Optional[str] = None
    escalation_level: int = 0

    class Config:
        from_attributes = True

class DoseConfirmRequest(BaseModel):
    status: str = "taken"  # taken, delayed, skipped, missed
    confirmation_method: str = "self_reported_web"  # self_reported_web, self_reported_voice, caretaker_verified_physical, caretaker_assisted
    notes: Optional[str] = None

class AdherenceEventOut(BaseModel):
    id: str
    scheduled_dose_id: str
    elderly_profile_id: str
    status: str
    recorded_at: datetime
    recorded_by_role: str
    confirmation_type: str
    delay_minutes: int
    notes: Optional[str] = None

    class Config:
        from_attributes = True
