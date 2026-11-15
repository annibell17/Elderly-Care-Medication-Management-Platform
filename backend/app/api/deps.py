import logging
import time
from typing import Optional, Dict, List
from fastapi import Depends, HTTPException, status, Header, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, ElderlyProfile, CareNetwork, Permission, AuditLog, UserSession

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# Simple in-memory sliding window rate limiter for brute-force protection
_rate_limits: Dict[str, List[float]] = {}

def check_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 60):
    now = time.time()
    timestamps = _rate_limits.get(key, [])
    # Filter out timestamps older than window
    valid_timestamps = [t for t in timestamps if now - t < window_seconds]
    if len(valid_timestamps) >= max_requests:
        retry_after = int(window_seconds - (now - valid_timestamps[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Too many attempts. Please retry after {retry_after} seconds."
        )
    valid_timestamps.append(now)
    _rate_limits[key] = valid_timestamps

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Enforces strict JWT authentication.
    Validates token payload, active user status, and checks against session revocation.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required"
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )

    # Session revocation check if jti is present in token
    jti = payload.get("jti")
    if jti:
        session_entry = db.query(UserSession).filter(UserSession.token_jti == jti).first()
        if session_entry and session_entry.is_revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked. Please log in again."
            )

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account is deactivated"
        )
    return user

def get_authorized_elderly_profile(
    current_user: User = Depends(get_current_user),
    profile_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> ElderlyProfile:
    """
    Backend permission verification on every protected request as required in Section 3:
    - If user is elderly, returns their own elderly profile.
    - If user is family or caretaker, verifies explicit, active CareNetwork membership for the profile.
    """
    if current_user.role == "elderly":
        profile = db.query(ElderlyProfile).filter(ElderlyProfile.user_id == current_user.id).first()
        if not profile:
            profile = ElderlyProfile(user_id=current_user.id)
            db.add(profile)
            db.commit()
            db.refresh(profile)
        return profile

    # For family member or caretaker:
    if profile_id:
        profile = db.query(ElderlyProfile).filter(ElderlyProfile.id == profile_id).first()
    else:
        # Check active care network membership
        network_entry = db.query(CareNetwork).filter(
            CareNetwork.user_id == current_user.id,
            CareNetwork.status == "active"
        ).first()
        if not network_entry:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have active authorized access to any elderly care profile"
            )
        profile = db.query(ElderlyProfile).filter(ElderlyProfile.id == network_entry.elderly_profile_id).first()

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elderly profile not found")

    # Verify authorization
    membership = db.query(CareNetwork).filter(
        CareNetwork.elderly_profile_id == profile.id,
        CareNetwork.user_id == current_user.id,
        CareNetwork.status == "active"
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not have authorized consent for this elderly profile"
        )

    return profile

def verify_permission(
    permission_name: str,
    current_user: User,
    profile: ElderlyProfile,
    db: Session
) -> bool:
    """
    Verifies granular permission for non-elderly users.
    Elderly users retain full sovereignty over their own profile.
    """
    if current_user.role == "elderly":
        return True

    membership = db.query(CareNetwork).filter(
        CareNetwork.elderly_profile_id == profile.id,
        CareNetwork.user_id == current_user.id,
        CareNetwork.status == "active"
    ).first()

    if not membership:
        return False

    perm = db.query(Permission).filter(Permission.care_network_id == membership.id).first()
    if not perm:
        return False

    return getattr(perm, permission_name, False)

def log_audit(db: Session, user_id: Optional[str], action: str, resource: str, resource_id: Optional[str] = None, details: dict = None, ip_address: Optional[str] = None):
    try:
        audit = AuditLog(
            user_id=user_id,
            action=action,
            target_resource=resource,
            target_id=resource_id,
            details=details or {},
            ip_address=ip_address
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        logger.error(f"Audit log error: {e}")
