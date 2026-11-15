import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON, Integer, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Medication(Base):
    __tablename__ = "medications"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    elderly_profile_id = Column(String(36), ForeignKey("elderly_profiles.id"), nullable=False)
    name = Column(String(255), nullable=False)
    generic_name = Column(String(255), nullable=True)
    dosage_strength = Column(String(100), nullable=False)  # e.g., "500mg", "10ml", "1 puff"
    form = Column(String(50), default="tablet")  # tablet, capsule, liquid, drops, inhaler, injection
    color_code = Column(String(20), default="#0D9488")  # visual identifier for elderly
    purpose = Column(String(255), nullable=True)  # e.g., "Blood pressure management"
    instructions = Column(Text, nullable=True)  # e.g., "Take after breakfast with a full glass of water"
    quantity_remaining = Column(Integer, default=30)
    refill_threshold = Column(Integer, default=7)
    total_prescribed = Column(Integer, default=30)
    prescribing_doctor_id = Column(String(36), ForeignKey("doctors.id"), nullable=True)
    
    # Historical preservation
    is_discontinued = Column(Boolean, default=False)
    discontinued_reason = Column(Text, nullable=True)
    discontinued_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    elderly_profile = relationship("ElderlyProfile", back_populates="medications")
    prescribing_doctor = relationship("Doctor", back_populates="prescribed_medications")
    schedules = relationship("MedicationSchedule", back_populates="medication", cascade="all, delete-orphan")
    doses = relationship("ScheduledDose", back_populates="medication", cascade="all, delete-orphan")

class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    medication_id = Column(String(36), ForeignKey("medications.id"), nullable=False)
    frequency_type = Column(String(50), default="daily")  # daily, twice_daily, thrice_daily, as_needed, custom_days
    scheduled_times = Column(JSON, default=list)  # ["08:00", "20:00"]
    start_date = Column(String(50), nullable=False)  # "YYYY-MM-DD"
    end_date = Column(String(50), nullable=True)  # "YYYY-MM-DD" or None for ongoing
    days_of_week = Column(JSON, default=lambda: [0, 1, 2, 3, 4, 5, 6])  # 0=Monday..6=Sunday
    reminder_minutes_before = Column(Integer, default=15)
    is_active = Column(Boolean, default=True)

    medication = relationship("Medication", back_populates="schedules")
    doses = relationship("ScheduledDose", back_populates="schedule", cascade="all, delete-orphan")

class ScheduledDose(Base):
    __tablename__ = "scheduled_doses"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    medication_id = Column(String(36), ForeignKey("medications.id"), nullable=False)
    schedule_id = Column(String(36), ForeignKey("medication_schedules.id"), nullable=True)
    scheduled_time = Column(DateTime, nullable=False, index=True)
    dose_label = Column(String(100), default="Scheduled Dose")  # e.g., "Morning Dose (8:00 AM)"
    
    # Meaningful statuses as requested
    status = Column(String(50), default="scheduled")  # scheduled, reminder_sent, taken, delayed, missed, skipped, unconfirmed
    dosage_amount = Column(String(100), nullable=True)
    
    reminder_sent_at = Column(DateTime, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    confirmed_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    confirmation_method = Column(String(50), nullable=True)  # self_reported_web, self_reported_voice, caretaker_verified_physical, caretaker_assisted
    notes = Column(Text, nullable=True)
    escalation_level = Column(Integer, default=0)  # 0: None, 1: Follow-up, 2: Caretaker alerted, 3: Family escalated

    medication = relationship("Medication", back_populates="doses")
    schedule = relationship("MedicationSchedule", back_populates="doses")
    adherence_events = relationship("AdherenceEvent", back_populates="scheduled_dose", cascade="all, delete-orphan")
    escalation_events = relationship("EscalationEvent", back_populates="scheduled_dose", cascade="all, delete-orphan")

class AdherenceEvent(Base):
    __tablename__ = "adherence_events"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    scheduled_dose_id = Column(String(36), ForeignKey("scheduled_doses.id"), nullable=False)
    elderly_profile_id = Column(String(36), ForeignKey("elderly_profiles.id"), nullable=False)
    
    status = Column(String(50), nullable=False)  # taken, delayed, missed, skipped, unconfirmed
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    recorded_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    recorded_by_role = Column(String(50), default="elderly")  # elderly, caretaker, system
    confirmation_type = Column(String(50), default="self_reported")  # self_reported, verified_physical, system_timeout
    delay_minutes = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    scheduled_dose = relationship("ScheduledDose", back_populates="adherence_events")
    elderly_profile = relationship("ElderlyProfile", back_populates="adherence_events")
