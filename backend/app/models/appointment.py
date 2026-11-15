import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    elderly_profile_id = Column(String(36), ForeignKey("elderly_profiles.id"), nullable=False)
    name = Column(String(255), nullable=False)
    specialization = Column(String(255), nullable=False)  # e.g., "Cardiologist", "Geriatric Specialist", "Neurologist"
    clinic_hospital = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    elderly_profile = relationship("ElderlyProfile", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    prescribed_medications = relationship("Medication", back_populates="prescribing_doctor")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    elderly_profile_id = Column(String(36), ForeignKey("elderly_profiles.id"), nullable=False)
    doctor_id = Column(String(36), ForeignKey("doctors.id"), nullable=False)
    
    appointment_date = Column(DateTime, nullable=False, index=True)
    duration_minutes = Column(Integer, default=30)
    location_type = Column(String(50), default="in_person")  # in_person, telehealth
    location_details = Column(String(255), nullable=True)  # Room number or telehealth video URL
    reason_for_visit = Column(String(255), nullable=False)
    status = Column(String(50), default="scheduled")  # scheduled, completed, cancelled, rescheduled
    notes = Column(Text, nullable=True)
    
    # Caregiver attendance coordination
    accompanying_caregiver_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    caregiver_attendance_status = Column(String(50), default="requested")  # requested, confirmed, declined
    
    # Pre-Appointment Briefing Feature
    pre_briefing_generated = Column(Boolean, default=False)
    pre_briefing_data = Column(JSON, default=dict)
    share_briefing_with_doctor = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    elderly_profile = relationship("ElderlyProfile", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    accompanying_caregiver = relationship("User", foreign_keys=[accompanying_caregiver_id])
