import logging
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.medication import ScheduledDose, Medication, AdherenceEvent
from app.models.care import EscalationEvent
from app.models.user import CareNetwork, User, ElderlyProfile
from app.models.notification import Notification
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def process_upcoming_reminders():
    """
    Finds doses scheduled within the lead time that haven't had a reminder sent yet,
    sends reminder notifications respecting user preferences, and marks status as 'reminder_sent'.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        window_end = now + timedelta(minutes=20)
        
        upcoming_doses = db.query(ScheduledDose).filter(
            ScheduledDose.status == "scheduled",
            ScheduledDose.scheduled_time <= window_end,
            ScheduledDose.reminder_sent_at == None
        ).all()

        for dose in upcoming_doses:
            medication = db.query(Medication).filter(Medication.id == dose.medication_id).first()
            if not medication:
                continue

            elderly_profile = db.query(ElderlyProfile).filter(ElderlyProfile.id == medication.elderly_profile_id).first()
            if not elderly_profile:
                continue

            user = db.query(User).filter(User.id == elderly_profile.user_id).first()
            if not user:
                continue

            dose.status = "reminder_sent"
            dose.reminder_sent_at = now
            db.commit()

            # Check user notification preferences
            prefs = elderly_profile.notification_preferences or {}
            if prefs.get("email_enabled", True):
                scheduled_time_str = dose.scheduled_time.strftime("%I:%M %p")
                email_service.send_notification_email(
                    to_email=user.email,
                    subject=f"CareCircle Reminder: Time for your {medication.name}",
                    title=f"Time to take your {medication.name}",
                    subtitle=f"Scheduled for {scheduled_time_str}",
                    body_html=f"""
                    <p>Hello {user.full_name},</p>
                    <p>This is your friendly reminder to take your scheduled dose:</p>
                    <div style="background-color: #F0FDFA; border-left: 4px solid #0D9488; padding: 14px 18px; border-radius: 6px; margin: 16px 0;">
                        <div style="font-size: 17px; font-weight: 700; color: #0F766E;">{medication.name} ({medication.dosage_strength})</div>
                        <div style="font-size: 14px; color: #334155; margin-top: 4px;"><strong>Instructions:</strong> {medication.instructions or 'Take as prescribed'}</div>
                    </div>
                    <p>Once taken, you can confirm via the web dashboard or using voice command: <em>"I have taken my medicine."</em></p>
                    """,
                    notification_type="medication_reminder",
                    user_id=user.id,
                    elderly_profile_id=elderly_profile.id,
                    action_button={"text": "Confirm Medication Taken", "url": "/my-medicines"},
                    metadata={"dose_id": dose.id, "medication_id": medication.id}
                )
                logger.info(f"Sent upcoming reminder for dose {dose.id} ({medication.name})")

    except Exception as e:
        logger.error(f"Error in process_upcoming_reminders: {e}")
    finally:
        db.close()

def process_unresolved_escalations():
    """
    Intelligent Escalation Loop:
    - If a dose is 30 mins overdue and still unconfirmed, marks as 'unconfirmed' and sends follow-up.
    - If 60 mins overdue, creates Escalation Stage 2 (Alert Caretaker).
    - If 120 mins overdue and unacknowledged/unresolved, creates Escalation Stage 3 (Escalate to Family Member).
    Prevents duplicates!
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        
        overdue_doses = db.query(ScheduledDose).filter(
            ScheduledDose.status.in_(["scheduled", "reminder_sent", "unconfirmed"]),
            ScheduledDose.scheduled_time < now - timedelta(minutes=settings.FOLLOW_UP_INTERVAL_MINUTES)
        ).all()

        for dose in overdue_doses:
            medication = db.query(Medication).filter(Medication.id == dose.medication_id).first()
            if not medication:
                continue

            elderly_profile = db.query(ElderlyProfile).filter(ElderlyProfile.id == medication.elderly_profile_id).first()
            if not elderly_profile:
                continue

            elderly_user = db.query(User).filter(User.id == elderly_profile.user_id).first()
            if not elderly_user:
                continue

            # Compare datetimes
            dose_time = dose.scheduled_time
            if dose_time.tzinfo is None:
                dose_time = dose_time.replace(tzinfo=timezone.utc)

            time_diff = (now - dose_time).total_seconds() / 60  # minutes

            # Stage 1: Follow-up to elderly user
            if time_diff >= settings.FOLLOW_UP_INTERVAL_MINUTES and dose.escalation_level < 1:
                dose.status = "unconfirmed"
                dose.escalation_level = 1
                db.commit()

                adh = AdherenceEvent(
                    scheduled_dose_id=dose.id,
                    elderly_profile_id=elderly_profile.id,
                    status="unconfirmed",
                    recorded_by_role="system",
                    confirmation_type="system_timeout",
                    delay_minutes=int(time_diff),
                    notes="Dose unconfirmed after standard reminder window."
                )
                db.add(adh)
                db.commit()

                email_service.send_notification_email(
                    to_email=elderly_user.email,
                    subject=f"CareCircle Check-in: Unconfirmed {medication.name}",
                    title="Gentle Check-in on Your Medication",
                    subtitle=f"{medication.name} was scheduled for {dose.scheduled_time.strftime('%I:%M %p')}",
                    body_html=f"""
                    <p>Hello {elderly_user.full_name},</p>
                    <p>We noticed you haven't confirmed your <strong>{medication.name}</strong> yet today.</p>
                    <p>If you've already taken it, please tap confirm below so your care records stay up-to-date.</p>
                    """,
                    notification_type="missed_medication",
                    user_id=elderly_user.id,
                    elderly_profile_id=elderly_profile.id,
                    action_button={"text": "Confirm Dose Taken", "url": "/my-medicines"},
                    metadata={"dose_id": dose.id, "stage": 1}
                )
                logger.info(f"Stage 1 follow-up processed for dose {dose.id}")

            # Stage 2: Alert designated caretaker
            if time_diff >= settings.CARETAKER_ESCALATION_MINUTES and dose.escalation_level < 2:
                dose.escalation_level = 2
                db.commit()

                caretaker_link = db.query(CareNetwork).filter(
                    CareNetwork.elderly_profile_id == elderly_profile.id,
                    CareNetwork.role == "caretaker",
                    CareNetwork.status == "active"
                ).first()

                if caretaker_link:
                    caretaker_user = db.query(User).filter(User.id == caretaker_link.user_id).first()
                    if caretaker_user:
                        esc = EscalationEvent(
                            scheduled_dose_id=dose.id,
                            elderly_profile_id=elderly_profile.id,
                            stage=2,
                            status="active"
                        )
                        db.add(esc)
                        db.commit()

                        email_service.send_notification_email(
                            to_email=caretaker_user.email,
                            subject=f"CareCircle Care Alert: Check-in needed for {elderly_user.full_name}",
                            title=f"Medication Check-in Requested for {elderly_user.full_name}",
                            subtitle=f"{medication.name} scheduled at {dose.scheduled_time.strftime('%I:%M %p')} remains unconfirmed",
                            body_html=f"""
                            <p>Hello {caretaker_user.full_name},</p>
                            <p>As {elderly_user.full_name}'s designated caretaker, please assist in checking whether their scheduled dose of <strong>{medication.name} ({medication.dosage_strength})</strong> has been taken.</p>
                            <p>Once verified, please acknowledge and record the assistance in your Caregiver Dashboard.</p>
                            """,
                            notification_type="escalation_alert",
                            user_id=caretaker_user.id,
                            elderly_profile_id=elderly_profile.id,
                            action_button={"text": "Review & Acknowledge Alert", "url": "/caretaker"},
                            metadata={"dose_id": dose.id, "stage": 2, "escalation_id": esc.id}
                        )
                        logger.info(f"Stage 2 caretaker alert sent for dose {dose.id}")

            # Stage 3: Escalate to authorized family member
            if time_diff >= settings.FAMILY_ESCALATION_MINUTES and dose.escalation_level < 3:
                dose.escalation_level = 3
                db.commit()

                family_links = db.query(CareNetwork).filter(
                    CareNetwork.elderly_profile_id == elderly_profile.id,
                    CareNetwork.role == "family_member",
                    CareNetwork.status == "active"
                ).all()

                for flink in family_links:
                    fam_user = db.query(User).filter(User.id == flink.user_id).first()
                    if fam_user:
                        esc = EscalationEvent(
                            scheduled_dose_id=dose.id,
                            elderly_profile_id=elderly_profile.id,
                            stage=3,
                            status="active"
                        )
                        db.add(esc)
                        db.commit()

                        email_service.send_notification_email(
                            to_email=fam_user.email,
                            subject=f"CareCircle Family Update: {elderly_user.full_name}'s Medication Escalation",
                            title=f"Healthcare Coordination Update for {elderly_user.full_name}",
                            subtitle=f"{medication.name} from earlier today has not been confirmed",
                            body_html=f"""
                            <p>Hello {fam_user.full_name},</p>
                            <p>This is a collaborative update for your family care circle. The scheduled dose of <strong>{medication.name}</strong> for {elderly_user.full_name} remains unconfirmed after caretaker notification.</p>
                            <p>Please coordinate with the care team or check in with {elderly_user.full_name} when convenient.</p>
                            """,
                            notification_type="escalation_alert",
                            user_id=fam_user.id,
                            elderly_profile_id=elderly_profile.id,
                            action_button={"text": "View Family Overview", "url": "/family"},
                            metadata={"dose_id": dose.id, "stage": 3, "escalation_id": esc.id}
                        )
                        logger.info(f"Stage 3 family escalation sent to {fam_user.email} for dose {dose.id}")

    except Exception as e:
        logger.error(f"Error in process_unresolved_escalations: {e}")
    finally:
        db.close()

def process_refill_checks():
    db: Session = SessionLocal()
    try:
        meds = db.query(Medication).filter(
            Medication.is_discontinued == False,
            Medication.quantity_remaining <= Medication.refill_threshold
        ).all()

        for med in meds:
            profile = db.query(ElderlyProfile).filter(ElderlyProfile.id == med.elderly_profile_id).first()
            if not profile:
                continue

            user = db.query(User).filter(User.id == profile.user_id).first()
            if not user:
                continue

            recent_notif = db.query(Notification).filter(
                Notification.user_id == user.id,
                Notification.notification_type == "refill_alert",
                Notification.metadata_json["medication_id"].as_string() == med.id
            ).first()

            if not recent_notif:
                email_service.send_notification_email(
                    to_email=user.email,
                    subject=f"CareCircle Refill Notice: {med.name} running low ({med.quantity_remaining} left)",
                    title=f"Refill Reminder for {med.name}",
                    subtitle=f"Only {med.quantity_remaining} doses remaining (threshold: {med.refill_threshold})",
                    body_html=f"""
                    <p>Hello {user.full_name},</p>
                    <p>Your supply of <strong>{med.name}</strong> is running low with approximately <strong>{med.quantity_remaining}</strong> tablets remaining.</p>
                    <p>Please contact your pharmacy or doctor to order a refill.</p>
                    """,
                    notification_type="refill_alert",
                    user_id=user.id,
                    elderly_profile_id=profile.id,
                    action_button={"text": "View Medicine Details", "url": "/my-medicines"},
                    metadata={"medication_id": med.id, "quantity_remaining": med.quantity_remaining}
                )
                logger.info(f"Refill notification triggered for {med.name}")

    except Exception as e:
        logger.error(f"Error in process_refill_checks: {e}")
    finally:
        db.close()

def retry_failed_notifications():
    """
    Automated Notification Retry Handling as required by Section 9:
    Identifies failed notifications with retry_count < 3 and attempts re-delivery.
    """
    db: Session = SessionLocal()
    try:
        failed_notifs = db.query(Notification).filter(
            Notification.delivery_status == "failed",
            Notification.retry_count < 3
        ).limit(10).all()

        for notif in failed_notifs:
            notif.retry_count += 1
            meta = notif.metadata_json or {}
            success = email_service.send_notification_email(
                to_email=notif.email_recipient,
                subject=notif.title,
                title=meta.get("title", notif.title),
                subtitle=meta.get("subtitle", ""),
                body_html=meta.get("full_html", f"<p>{notif.message}</p>"),
                notification_type=notif.notification_type,
                user_id=notif.user_id,
                elderly_profile_id=notif.elderly_profile_id,
                metadata={"is_retry": True, "original_id": notif.id}
            )
            if success:
                notif.delivery_status = "delivered"
                notif.error_details = None
            db.commit()
    except Exception as e:
        logger.error(f"Error in retry_failed_notifications: {e}")
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(process_upcoming_reminders, 'interval', minutes=2, id='upcoming_reminders', replace_existing=True)
        scheduler.add_job(process_unresolved_escalations, 'interval', minutes=5, id='unresolved_escalations', replace_existing=True)
        scheduler.add_job(process_refill_checks, 'interval', hours=1, id='refill_checks', replace_existing=True)
        scheduler.add_job(retry_failed_notifications, 'interval', minutes=10, id='retry_notifications', replace_existing=True)
        scheduler.start()
        logger.info("CareCircle background scheduler started.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("CareCircle background scheduler stopped.")
