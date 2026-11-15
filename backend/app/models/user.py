import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="elderly")  # elderly, family_member, caretaker, doctor
    phone_number = Column(String(50), nullable=True)
    language_pref = Column(String(10), default="en")  # en, hi
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    elderly_profile = relationship("ElderlyProfile", back_populates="user", uselist=False, foreign_keys="ElderlyProfile.user_id")
    care_network_memberships = relationship("CareNetwork", back_populates="user", foreign_keys="CareNetwork.user_id")
    sent_invitations = relationship("Invitation", back_populates="creator", foreign_keys="Invitation.created_by")
    audit_logs = relationship("AuditLog", back_populates="user")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

class UserSession(Base):
    """
    Session Management and Revocation table as required by Section 3 & 10.
    Tracks active tokens and allows revocation of specific sessions or all user sessions.
    """
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_jti = Column(String(64), unique=True, index=True, nullable=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")

class ElderlyProfile(Base):
    __tablename__ = "elderly_profiles"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    date_of_birth = Column(String(50), nullable=True)
    blood_type = Column(String(10), nullable=True)  # A+, B+, O+, AB+, etc.
    primary_language = Column(String(50), default="English")
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    emergency_contact_relation = Column(String(100), nullable=True)
    allergies = Column(JSON, default=list)  # ["Penicillin", "Peanuts", etc.]
    chronic_conditions = Column(JSON, default=list)  # ["Hypertension", "Type 2 Diabetes"]
    notes = Column(Text, nullable=True)
    notification_preferences = Column(JSON, default=lambda: {
        "email_enabled": True,
        "lead_time_minutes": 15,
        "escalation_notifications": True,
        "refill_alerts": True,
        "appointment_reminders": True
    })
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="elderly_profile", foreign_keys=[user_id])
    network_members = relationship("CareNetwork", back_populates="elderly_profile", cascade="all, delete-orphan")
    invitations = relationship("Invitation", back_populates="elderly_profile", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="elderly_profile", cascade="all, delete-orphan")
    doctors = relationship("Doctor", back_populates="elderly_profile", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="elderly_profile", cascade="all, delete-orphan")
    caregiver_logs = relationship("CaregiverLog", back_populates="elderly_profile", cascade="all, delete-orphan")
    health_observations = relationship("HealthObservation", back_populates="elderly_profile", cascade="all, delete-orphan")
    medical_documents = relationship("MedicalDocument", back_populates="elderly_profile", cascade="all, delete-orphan")
    adherence_events = relationship("AdherenceEvent", back_populates="elderly_profile", cascade="all, delete-orphan")
    escalation_events = relationship("EscalationEvent", back_populates="elderly_profile", cascade="all, delete-orphan")

class CareNetwork(Base):
    __tablename__ = "care_network"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    elderly_profile_id = Column(String(36), ForeignKey("elderly_profiles.id"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    role = Column(String(50), nullable=False)  # family_member, caretaker
    relationship_label = Column(String(100), nullable=False)  # e.g., "Daughter", "Morning Nurse"
    is_primary = Column(Boolean, default=False)
    status = Column(String(50), default="active")  # active, revoked
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    elderly_profile = relationship("ElderlyProfile", back_populates="network_members")
    user = relationship("User", back_populates="care_network_memberships")
    permissions = relationship("Permission", back_populates="care_network", uselist=False, cascade="all, delete-orphan")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    care_network_id = Column(String(36), ForeignKey("care_network.id"), unique=True, index=True, nullable=False)
    
    can_view_medications = Column(Boolean, default=True)
    can_confirm_medications = Column(Boolean, default=False)
    can_manage_schedules = Column(Boolean, default=False)
    can_view_appointments = Column(Boolean, default=True)
    can_schedule_appointments = Column(Boolean, default=False)
    can_view_health_records = Column(Boolean, default=False)
    can_view_analytics = Column(Boolean, default=True)
    can_receive_escalations = Column(Boolean, default=True)
    can_write_handover_logs = Column(Boolean, default=False)

    care_network = relationship("CareNetwork", back_populates="permissions")

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    elderly_profile_id = Column(String(36), ForeignKey("elderly_profiles.id"), index=True, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    invited_email = Column(String(255), nullable=False)
    invited_role = Column(String(50), nullable=False)  # family_member, caretaker
    relationship_label = Column(String(100), nullable=False)
    token = Column(String(100), unique=True, index=True, nullable=False)
    invite_code = Column(String(10), unique=True, index=True, nullable=False)  # 6-char code
    permissions = Column(JSON, default=dict)
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(50), default="pending")  # pending, accepted, rejected, expired
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    elderly_profile = relationship("ElderlyProfile", back_populates="invitations")
    creator = relationship("User", back_populates="sent_invitations")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), index=True, nullable=False)
    target_resource = Column(String(100), nullable=False)
    target_id = Column(String(100), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="audit_logs")
