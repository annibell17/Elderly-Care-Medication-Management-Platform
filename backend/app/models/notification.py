import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    elderly_profile_id = Column(String(36), ForeignKey("elderly_profiles.id"), nullable=True)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)  # medication_reminder, missed_medication, escalation_alert, appointment_reminder, refill_alert, handover_update
    channel = Column(String(50), default="in_app")  # in_app, email, sms
    delivery_status = Column(String(50), default="sent")  # sent, pending, failed, delivered
    email_recipient = Column(String(255), nullable=True)
    retry_count = Column(Integer, default=0)
    scheduled_for = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    read_at = Column(DateTime, nullable=True)
    error_details = Column(Text, nullable=True)
    metadata_json = Column(JSON, default=dict)

    user = relationship("User", foreign_keys=[user_id])
