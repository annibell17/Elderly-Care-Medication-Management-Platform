from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import generate_invitation_token, generate_friendly_invite_code
from app.models.user import User, ElderlyProfile, CareNetwork, Permission, Invitation
from app.models.care import CaregiverLog, HealthObservation
from app.schemas.user import (
    CareNetworkMemberOut, InvitationCreate, InvitationOut, AcceptInvitationRequest,
    PermissionUpdate, PermissionOut
)
from app.schemas.care import (
    CaregiverLogCreate, CaregiverLogOut, HealthObservationCreate, HealthObservationOut
)
from app.api.deps import get_current_user, get_authorized_elderly_profile, verify_permission, log_audit, check_rate_limit
from app.services.email_service import email_service
from pydantic import BaseModel

router = APIRouter(prefix="/care-network", tags=["Care Network"])

class RejectInvitationRequest(BaseModel):
    invite_code: str
    reason: Optional[str] = "Declined by user"

@router.get("/members", response_model=List[CareNetworkMemberOut])
def list_care_network_members(
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    members = db.query(CareNetwork).filter(
        CareNetwork.elderly_profile_id == profile.id,
        CareNetwork.status == "active"
    ).all()

    results = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        perm = db.query(Permission).filter(Permission.care_network_id == m.id).first()
        results.append({
            "id": m.id,
            "user_id": m.user_id,
            "full_name": u.full_name if u else "Caregiver",
            "email": u.email if u else "",
            "role": m.role,
            "relationship_label": m.relationship_label,
            "is_primary": m.is_primary,
            "status": m.status,
            "added_at": m.added_at,
            "permissions": perm
        })
    return results

@router.get("/invitations", response_model=List[InvitationOut])
def list_invitations(
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns pending and past invitations created by the elderly profile.
    """
    if current_user.role != "elderly":
        raise HTTPException(status_code=403, detail="Only the elderly individual can view invitations")

    return db.query(Invitation).filter(
        Invitation.elderly_profile_id == profile.id
    ).order_by(Invitation.created_at.desc()).all()

@router.post("/invite", response_model=InvitationOut)
def invite_member(
    invite_in: InvitationCreate,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly":
        raise HTTPException(
            status_code=403,
            detail="Only the elderly individual can invite care network members"
        )

    token = generate_invitation_token()
    invite_code = generate_friendly_invite_code()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invitation = Invitation(
        elderly_profile_id=profile.id,
        created_by=current_user.id,
        invited_email=invite_in.invited_email,
        invited_role=invite_in.invited_role,
        relationship_label=invite_in.relationship_label,
        token=token,
        invite_code=invite_code,
        permissions=invite_in.permissions.model_dump() if invite_in.permissions else {},
        expires_at=expires_at,
        status="pending"
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    email_service.send_notification_email(
        to_email=invite_in.invited_email,
        subject=f"{current_user.full_name} invited you to join their CareCircle",
        title="You've been invited to CareCircle",
        subtitle=f"{current_user.full_name} has invited you to assist as their {invite_in.relationship_label}",
        body_html=f"""
        <p>Hello,</p>
        <p><strong>{current_user.full_name}</strong> has invited you to join their personal healthcare circle as a <strong>{invite_in.invited_role.replace('_', ' ').title()}</strong> ({invite_in.relationship_label}).</p>
        <div style="background-color: #F8FAFC; border: 2px dashed #0D9488; padding: 18px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <div style="font-size: 13px; color: #64748B; text-transform: uppercase; font-weight: 600;">Your 6-Digit Invitation Code</div>
            <div style="font-size: 32px; font-weight: 800; color: #0F766E; letter-spacing: 4px; margin-top: 6px;">{invite_code}</div>
            <div style="font-size: 12px; color: #94A3B8; margin-top: 6px;">Expires in 7 days</div>
        </div>
        <p>Use this code in the app to accept and assist with care coordination.</p>
        """,
        notification_type="invitation",
        user_id=current_user.id,
        elderly_profile_id=profile.id,
        action_button={"text": "Accept Invitation", "url": f"/care-circle"}
    )

    log_audit(db, current_user.id, "INVITE_MEMBER", "invitation", invitation.id, {"email": invite_in.invited_email})
    return invitation

@router.post("/accept-invite")
def accept_invitation(
    req: AcceptInvitationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    # Rate limit invite code verification: max 6 attempts per 10 minutes per IP
    check_rate_limit(f"invite_accept_{client_ip}", max_requests=6, window_seconds=600)

    invitation = db.query(Invitation).filter(
        (Invitation.invite_code == req.invite_code) | (Invitation.token == req.invite_code),
        Invitation.status == "pending"
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation code")

    now = datetime.now(timezone.utc)
    inv_expiry = invitation.expires_at.replace(tzinfo=timezone.utc) if invitation.expires_at.tzinfo is None else invitation.expires_at
    if inv_expiry < now:
        invitation.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="This invitation code has expired")

    invitation.status = "accepted"

    # Check if already a member to prevent duplicates
    existing_membership = db.query(CareNetwork).filter(
        CareNetwork.elderly_profile_id == invitation.elderly_profile_id,
        CareNetwork.user_id == current_user.id
    ).first()

    if existing_membership:
        existing_membership.status = "active"
        existing_membership.role = invitation.invited_role
        existing_membership.relationship_label = invitation.relationship_label
        network_entry = existing_membership
    else:
        network_entry = CareNetwork(
            elderly_profile_id=invitation.elderly_profile_id,
            user_id=current_user.id,
            role=invitation.invited_role,
            relationship_label=invitation.relationship_label,
            status="active"
        )
        db.add(network_entry)
        db.commit()
        db.refresh(network_entry)

    perm_dict = invitation.permissions or {}
    perm = db.query(Permission).filter(Permission.care_network_id == network_entry.id).first()
    if not perm:
        perm = Permission(care_network_id=network_entry.id)
        db.add(perm)

    perm.can_view_medications = perm_dict.get("can_view_medications", True)
    perm.can_confirm_medications = perm_dict.get("can_confirm_medications", invitation.invited_role == "caretaker")
    perm.can_manage_schedules = perm_dict.get("can_manage_schedules", False)
    perm.can_view_appointments = perm_dict.get("can_view_appointments", True)
    perm.can_schedule_appointments = perm_dict.get("can_schedule_appointments", False)
    perm.can_view_health_records = perm_dict.get("can_view_health_records", False)
    perm.can_view_analytics = perm_dict.get("can_view_analytics", True)
    perm.can_receive_escalations = perm_dict.get("can_receive_escalations", True)
    perm.can_write_handover_logs = perm_dict.get("can_write_handover_logs", invitation.invited_role == "caretaker")

    db.commit()
    log_audit(db, current_user.id, "ACCEPT_INVITATION", "care_network", network_entry.id)

    return {
        "success": True,
        "message": f"Successfully joined {invitation.relationship_label}'s CareCircle!",
        "care_network_id": network_entry.id,
        "elderly_profile_id": invitation.elderly_profile_id
    }

@router.post("/reject-invite")
def reject_invitation(
    req: RejectInvitationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supports rejecting an invitation as explicitly specified in Module D.
    """
    invitation = db.query(Invitation).filter(
        (Invitation.invite_code == req.invite_code) | (Invitation.token == req.invite_code),
        Invitation.status == "pending"
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or no longer pending")

    invitation.status = "rejected"
    db.commit()
    log_audit(db, current_user.id, "REJECT_INVITATION", "invitation", invitation.id, {"reason": req.reason})
    return {"success": True, "message": "Invitation rejected."}

@router.put("/permissions/{network_id}")
def update_member_permissions(
    network_id: str,
    perm_in: PermissionUpdate,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly":
        raise HTTPException(status_code=403, detail="Only the elderly individual can modify permissions")

    network_entry = db.query(CareNetwork).filter(
        CareNetwork.id == network_id,
        CareNetwork.elderly_profile_id == profile.id
    ).first()
    if not network_entry:
        raise HTTPException(status_code=404, detail="Care network member not found")

    perm = db.query(Permission).filter(Permission.care_network_id == network_entry.id).first()
    if not perm:
        perm = Permission(care_network_id=network_entry.id)
        db.add(perm)

    for field, val in perm_in.model_dump().items():
        setattr(perm, field, val)

    db.commit()
    log_audit(db, current_user.id, "UPDATE_PERMISSIONS", "permission", perm.id)
    return {"success": True, "message": "Permissions updated successfully"}

@router.delete("/members/{network_id}")
def revoke_member_access(
    network_id: str,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly":
        raise HTTPException(status_code=403, detail="Only the elderly individual can revoke access")

    network_entry = db.query(CareNetwork).filter(
        CareNetwork.id == network_id,
        CareNetwork.elderly_profile_id == profile.id
    ).first()
    if not network_entry:
        raise HTTPException(status_code=404, detail="Care network member not found")

    network_entry.status = "revoked"
    db.commit()
    log_audit(db, current_user.id, "REVOKE_ACCESS", "care_network", network_id)
    return {"success": True, "message": "Care network access revoked successfully"}

# Handover Logs
@router.get("/handover-logs", response_model=List[CaregiverLogOut])
def list_handover_logs(
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(CaregiverLog).filter(
        CaregiverLog.elderly_profile_id == profile.id
    ).order_by(CaregiverLog.created_at.desc()).limit(30).all()

    results = []
    for l in logs:
        u = db.query(User).filter(User.id == l.author_id).first()
        results.append({
            "id": l.id,
            "elderly_profile_id": l.elderly_profile_id,
            "author_id": l.author_id,
            "author_name": u.full_name if u else "Caregiver",
            "shift_type": l.shift_type,
            "date": l.date,
            "blood_pressure": l.blood_pressure,
            "heart_rate": l.heart_rate,
            "blood_sugar": l.blood_sugar,
            "temperature": l.temperature,
            "mood": l.mood,
            "appetite": l.appetite,
            "sleep_quality": l.sleep_quality,
            "activities_assisted": l.activities_assisted or [],
            "observations": l.observations,
            "handover_notes": l.handover_notes,
            "created_at": l.created_at
        })
    return results

@router.post("/handover-logs", response_model=CaregiverLogOut)
def create_handover_log(
    log_in: CaregiverLogCreate,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "elderly" and not verify_permission("can_write_handover_logs", current_user, profile, db):
        raise HTTPException(status_code=403, detail="Permission required to write handover logs")

    clog = CaregiverLog(
        elderly_profile_id=profile.id,
        author_id=current_user.id,
        shift_type=log_in.shift_type,
        date=log_in.date,
        blood_pressure=log_in.blood_pressure,
        heart_rate=log_in.heart_rate,
        blood_sugar=log_in.blood_sugar,
        temperature=log_in.temperature,
        mood=log_in.mood,
        appetite=log_in.appetite,
        sleep_quality=log_in.sleep_quality,
        activities_assisted=log_in.activities_assisted,
        observations=log_in.observations,
        handover_notes=log_in.handover_notes
    )
    db.add(clog)
    db.commit()
    db.refresh(clog)
    log_audit(db, current_user.id, "CREATE_HANDOVER_LOG", "caregiver_log", clog.id)

    return {
        **clog.__dict__,
        "author_name": current_user.full_name
    }

# Caregiver Observations
@router.get("/observations", response_model=List[HealthObservationOut])
def list_observations(
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    obs = db.query(HealthObservation).filter(
        HealthObservation.elderly_profile_id == profile.id
    ).order_by(HealthObservation.recorded_at.desc()).limit(30).all()

    results = []
    for o in obs:
        u = db.query(User).filter(User.id == o.author_id).first()
        results.append({
            "id": o.id,
            "elderly_profile_id": o.elderly_profile_id,
            "author_id": o.author_id,
            "author_name": u.full_name if u else "Caregiver",
            "observation_type": o.observation_type,
            "title": o.title,
            "description": o.description,
            "severity": o.severity,
            "recorded_at": o.recorded_at
        })
    return results

@router.post("/observations", response_model=HealthObservationOut)
def create_observation(
    obs_in: HealthObservationCreate,
    profile: ElderlyProfile = Depends(get_authorized_elderly_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    obs = HealthObservation(
        elderly_profile_id=profile.id,
        author_id=current_user.id,
        observation_type=obs_in.observation_type,
        title=obs_in.title,
        description=obs_in.description,
        severity=obs_in.severity
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    log_audit(db, current_user.id, "CREATE_OBSERVATION", "health_observation", obs.id)

    return {
        **obs.__dict__,
        "author_name": current_user.full_name
    }
