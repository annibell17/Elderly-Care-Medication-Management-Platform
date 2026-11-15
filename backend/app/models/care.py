import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON, Integer, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class CaregiverLog(Base):
    __tablename__ = "caregiver_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    elderly_profile_id = Column(String(36), ForeignKey("elderly_profiles.id"), nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    shift_type = Column(String(50), default="morning")  # morning, afternoon, evening, night
    date = Column(String(50), nullable=False)  # "YYYY-MM-DD"
    
    blood_pressure = Column(String(50), nullable=True)  # e.g., "125/82 mmHg"
    heart_rate = Column(Integer, nullable=True)  # bpm
    blood_sugar = Column(Float, nullable=True)  # mg/dL
    temperature = Column(Float, nullable=True)  # deg F / C
    
    mood = Column(String(50), default="calm")  # cheerful, calm, tired, confused, agitated
    appetite = Column(String(50), default="good")  # good, fair, poor
    sleep_quality = Column(String(50), default="peaceful")  # peaceful, interrupted, restless
    activities_assisted = Column(JSON, default=list)  # ["Morning walk", "Breakfast assistance", "Blood pressure check"]
    
    observations = Column(Text, nullable=True)
    handover_notes = Column(Text, nullable=True)  # Specific instructions for the incoming caregiver
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    elderly_profile = relationship("ElderlyProfile", back_populates="caregiver_logs")
    author = relationship("User", foreign_keys=[author_id])

class HealthObservation(Base):
    __tablename__ = "health_observations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    elderly_profile_id = Column(String(36), ForeignKey("elderly_profiles.id"), nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    observation_type = Column(String(50), default="symptom")  # symptom, vital_trend, mobility, dietary, mood, general
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(50), default="low")  # low, medium, high
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    elderly_profile = relationship("ElderlyProfile", back_populates="health_observations")
    author = relationship("User", foreign_keys=[author_id])

class EscalationEvent(Base):
    __tablename__ = "escalation_events"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    scheduled_dose_id = Column(String(36), ForeignKey("scheduled_doses.id"), nullable=False)
    elderly_profile_id = Column(String(36), ForeignKey("elderly_profiles.id"), nullable=False)
    
    stage = Column(Integer, default=1)  # 1: elderly follow-up, 2: caretaker alerted, 3: family escalated
    triggered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Separate tracking for acknowledgement vs resolution as required
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    status = Column(String(50), default="active")  # active, acknowledged, resolved, cancelled

    scheduled_dose = relationship("ScheduledDose", back_populates="escalation_events")
    elderly_profile = relationship("ElderlyProfile", back_populates="escalation_events")
    acknowledged_by = relationship("User", foreign_keys=[acknowledged_by_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
