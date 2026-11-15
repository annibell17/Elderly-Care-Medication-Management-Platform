from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel

class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    notification_type: str
    channel: str
    delivery_status: str
    email_recipient: Optional[str] = None
    sent_at: datetime
    read_at: Optional[datetime] = None
    metadata_json: Dict[str, Any] = {}

    class Config:
        from_attributes = True

class TestNotificationRequest(BaseModel):
    notification_type: str = "medication_reminder"
    medication_name: str = "Metformin"
    dosage: str = "500mg"
    recipient_email: Optional[str] = None
