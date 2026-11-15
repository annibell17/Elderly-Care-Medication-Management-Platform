import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import urllib.request
import json
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.notification import Notification

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.provider = settings.EMAIL_PROVIDER
        self.from_email = settings.EMAILS_FROM_EMAIL
        self.from_name = settings.EMAILS_FROM_NAME

    def _render_template(self, title: str, subtitle: str, content_html: str, action_button: Optional[Dict[str, str]] = None) -> str:
        button_html = ""
        if action_button:
            button_html = f"""
            <div style="margin: 28px 0; text-align: center;">
                <a href="{action_button.get('url', '#')}" 
                   style="background-color: #0D9488; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                    {action_button.get('text', 'View in CareCircle')}
                </a>
            </div>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{title}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #FAF9F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF9F5; padding: 32px 16px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); border: 1px solid #E2E8F0; overflow: hidden;">
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #0F766E; padding: 28px 32px; text-align: left;">
                                    <div style="font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">
                                        CareCircle
                                    </div>
                                    <div style="font-size: 13px; color: #CCFBF1; margin-top: 4px; font-weight: 500;">
                                        Intelligent Elderly Healthcare & Care Coordination
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Body -->
                            <tr>
                                <td style="padding: 32px;">
                                    <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #0F172A;">
                                        {title}
                                    </h2>
                                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569; line-height: 1.5;">
                                        {subtitle}
                                    </p>
                                    <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; font-size: 15px; line-height: 1.6; color: #1E293B;">
                                        {content_html}
                                    </div>
                                    {button_html}
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center;">
                                    <p style="margin: 0 0 6px 0;">CareCircle Philosophy: <em>Independence first. Assistance when needed. Intervention when necessary.</em></p>
                                    <p style="margin: 0;">This is a system notification sent on behalf of the registered elderly care profile.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

    def send_notification_email(
        self,
        to_email: str,
        subject: str,
        title: str,
        subtitle: str,
        body_html: str,
        notification_type: str,
        user_id: str,
        elderly_profile_id: Optional[str] = None,
        action_button: Optional[Dict[str, str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        full_html = self._render_template(title, subtitle, body_html, action_button)
        delivery_status = "sent"
        error_msg = None

        # 1. Resend API Provider
        if self.provider == "resend" and settings.RESEND_API_KEY:
            try:
                payload = json.dumps({
                    "from": f"{self.from_name} <{self.from_email}>",
                    "to": [to_email],
                    "subject": subject,
                    "html": full_html
                }).encode("utf-8")

                req = urllib.request.Request(
                    "https://api.resend.com/emails",
                    data=payload,
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    if response.status in (200, 201):
                        delivery_status = "delivered"
                    else:
                        delivery_status = "failed"
                        error_msg = f"Resend API error status: {response.status}"
            except Exception as e:
                logger.error(f"Resend API dispatch failed: {e}")
                delivery_status = "failed"
                error_msg = str(e)

        # 2. SMTP Provider
        elif self.provider == "smtp" and settings.SMTP_HOST:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"{self.from_name} <{self.from_email}>"
                msg["To"] = to_email
                msg.attach(MIMEText(full_html, "html"))

                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                    if settings.SMTP_USER and settings.SMTP_PASSWORD:
                        server.starttls()
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(self.from_email, [to_email], msg.as_string())
                delivery_status = "delivered"
            except Exception as e:
                logger.error(f"SMTP send failed: {e}")
                delivery_status = "failed"
                error_msg = str(e)
        else:
            # 3. Demo Sandbox Mode (Recorded for In-App Mailbox inspection)
            delivery_status = "delivered"

        # Record notification in database
        try:
            db = SessionLocal()
            notif = Notification(
                user_id=user_id,
                elderly_profile_id=elderly_profile_id,
                title=subject,
                message=f"{subtitle}\n\n{title}",
                notification_type=notification_type,
                channel="email",
                delivery_status=delivery_status,
                email_recipient=to_email,
                sent_at=datetime.now(timezone.utc),
                error_details=error_msg,
                metadata_json={
                    **(metadata or {}),
                    "full_html": full_html,
                    "title": title,
                    "subtitle": subtitle
                }
            )
            db.add(notif)
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Error saving notification to DB: {e}")

        return delivery_status == "delivered"

email_service = EmailService()
