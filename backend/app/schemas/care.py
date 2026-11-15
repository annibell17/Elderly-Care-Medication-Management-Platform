from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class CaregiverLogBase(BaseModel):
    shift_type: str = "morning"  # morning, afternoon, evening, night
    date: str  # "YYYY-MM-DD"
    blood_pressure: Optional[str] = None
    heart_rate: Optional[int] = None
    blood_sugar: Optional[float] = None
    temperature: Optional[float] = None
    mood: str = "calm"  # cheerful, calm, tired, confused, agitated
    appetite: str = "good"  # good, fair, poor
    sleep_quality: str = "peaceful"  # peaceful, interrupted, restless
    activities_assisted: List[str] = []
    observations: Optional[str] = None
    handover_notes: Optional[str] = None

class CaregiverLogCreate(CaregiverLogBase):
    pass

class CaregiverLogOut(CaregiverLogBase):
    id: str
    elderly_profile_id: str
    author_id: str
    author_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class HealthObservationBase(BaseModel):
    observation_type: str = "symptom"  # symptom, vital_trend, mobility, dietary, mood, general
    title: str
    description: str
    severity: str = "low"  # low, medium, high

class HealthObservationCreate(HealthObservationBase):
    pass

class HealthObservationOut(HealthObservationBase):
    id: str
    elderly_profile_id: str
    author_id: str
    author_name: Optional[str] = None
    recorded_at: datetime

    class Config:
        from_attributes = True

class EscalationEventOut(BaseModel):
    id: str
    scheduled_dose_id: str
    medication_name: Optional[str] = None
    dosage_strength: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    stage: int
    status: str  # active, acknowledged, resolved, cancelled
    triggered_at: datetime
    acknowledged_at: Optional[datetime] = None
    acknowledged_by_name: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by_name: Optional[str] = None
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True

class EscalationAcknowledgeRequest(BaseModel):
    notes: Optional[str] = "Acknowledged by caregiver"

class EscalationResolveRequest(BaseModel):
    resolution_notes: str
    dose_status: str = "taken"  # taken, skipped, missed
    confirmation_method: str = "caretaker_verified_physical"
