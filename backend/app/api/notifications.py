from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.notification import Notification
from app.models.user import User, ElderlyProfile
from app.schemas.notification import NotificationOut, TestNotificationRequest
from app.api.deps import get_current_user, get_authorized_elderly_profile, log_audit
from app.services.email_service import email_service

router = APIRouter(prefix="/notifications", tags=["Notification System"])

@router.get("", response_model=List[NotificationOut])
def list_notifications(
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns user notifications with delivery status, timestamps, and metadata.
    """
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.sent_at.desc()).limit(limit).all()

@router.get("/mailbox")
def get_demo_mailbox(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Demo Mailbox:
    Returns delivered email notifications with their full rendered HTML email templates,
    enabling hackathon evaluators to preview delivered emails interactively.
    """
    notifications = db.query(Notification).filter(
        Notification.channel == "email"
    ).order_by(Notification.sent_at.desc()).limit(limit).all()

    mailbox_items = []
    for n in notifications:
        meta = n.metadata_json or {}
        mailbox_items.append({
            "id": n.id,
            "to_email": n.email_recipient or current_user.email,
            "subject": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "delivery_status": n.delivery_status,
            "sent_at": n.sent_at,
            "rendered_html": meta.get("full_html", f"<div>{n.message}</div>"),
            "subtitle": meta.get("subtitle", "")
        })
    return mailbox_items

@router.post("/mark-read/{notification_id}")
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.read_at = datetime.now(timezone.utc)
        db.commit()
    return {"success": True}

@router.post("/test-send")
def send_test_notification(
    req: TestNotificationRequest,
    current_user: User = Depends(get_current_user),
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    db: Session = Depends(get_db)
):
    """
    Sends a test notification email (recorded in demo mailbox or sent via SMTP).
    """
    recipient = req.recipient_email or current_user.email
    success = email_service.send_notification_email(
        to_email=recipient,
        subject=f"[CareCircle Test] {req.notification_type.replace('_', ' ').title()}: {req.medication_name}",
        title=f"Sample Alert: {req.medication_name} ({req.dosage})",
        subtitle="This is a test notification from the CareCircle Notification Engine.",
        body_html=f"""
        <p>Hello {current_user.full_name},</p>
        <p>This is a live test notification generated from the CareCircle settings interface.</p>
        <p><strong>Medication:</strong> {req.medication_name} ({req.dosage})</p>
        <p><strong>Channel:</strong> Email (Verified delivery)</p>
        """,
        notification_type=req.notification_type,
        user_id=current_user.id,
        elderly_profile_id=profile.id,
        action_button={"text": "Open CareCircle", "url": "/"}
    )
    log_audit(db, current_user.id, "TEST_NOTIFICATION", "notification", details={"type": req.notification_type})
    return {"success": success, "recipient": recipient, "provider": email_service.provider}
