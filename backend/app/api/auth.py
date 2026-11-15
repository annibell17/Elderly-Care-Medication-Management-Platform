from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User, ElderlyProfile, CareNetwork, UserSession
from app.schemas.user import UserCreate, UserLogin, UserOut, Token, ElderlyProfileOut
from app.api.deps import get_current_user, log_audit, check_rate_limit

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"register_{client_ip}", max_requests=5, window_seconds=60)

    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )

    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        phone_number=user_in.phone_number,
        language_pref=user_in.language_pref
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    elderly_profile_id = None
    if user.role == "elderly":
        profile = ElderlyProfile(
            user_id=user.id,
            primary_language="English" if user.language_pref == "en" else "Hindi"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        elderly_profile_id = profile.id

    access_token, token_jti, expire_dt = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "email": user.email}
    )

    # Record active session
    session_record = UserSession(
        user_id=user.id,
        token_jti=token_jti,
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent", "unknown")[:255],
        expires_at=expire_dt
    )
    db.add(session_record)
    db.commit()

    log_audit(db, user.id, "REGISTER", "user", user.id, ip_address=client_ip)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "elderly_profile_id": elderly_profile_id
    }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    # Rate limit: max 5 login attempts per minute per IP to prevent brute force
    check_rate_limit(f"login_{client_ip}", max_requests=5, window_seconds=60)

    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        log_audit(db, None, "LOGIN_FAILED", "user", details={"email": login_data.email}, ip_address=client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    elderly_profile_id = None
    if user.role == "elderly":
        profile = db.query(ElderlyProfile).filter(ElderlyProfile.user_id == user.id).first()
        if profile:
            elderly_profile_id = profile.id
    else:
        membership = db.query(CareNetwork).filter(
            CareNetwork.user_id == user.id,
            CareNetwork.status == "active"
        ).first()
        if membership:
            elderly_profile_id = membership.elderly_profile_id

    access_token, token_jti, expire_dt = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "email": user.email}
    )

    # Record active session
    session_record = UserSession(
        user_id=user.id,
        token_jti=token_jti,
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent", "unknown")[:255],
        expires_at=expire_dt
    )
    db.add(session_record)
    db.commit()

    log_audit(db, user.id, "LOGIN", "user", user.id, ip_address=client_ip)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "elderly_profile_id": elderly_profile_id
    }

@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Session Revocation: Marks current token as revoked in UserSession.
    """
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip()
    from app.core.security import decode_access_token
    payload = decode_access_token(token)
    if payload and "jti" in payload:
        session_entry = db.query(UserSession).filter(UserSession.token_jti == payload["jti"]).first()
        if session_entry:
            session_entry.is_revoked = True
            session_entry.revoked_at = datetime.now(timezone.utc)
            db.commit()

    log_audit(db, current_user.id, "LOGOUT", "user", current_user.id)
    return {"success": True, "message": "Successfully logged out and session revoked"}

@router.post("/revoke-all-sessions")
def revoke_all_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Revokes all active sessions for current user across all devices.
    """
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False
    ).update({
        "is_revoked": True,
        "revoked_at": datetime.now(timezone.utc)
    })
    db.commit()
    log_audit(db, current_user.id, "REVOKE_ALL_SESSIONS", "user", current_user.id)
    return {"success": True, "message": "All active sessions have been revoked."}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    elderly_profile_id = None
    profile_data = None

    if current_user.role == "elderly":
        profile = db.query(ElderlyProfile).filter(ElderlyProfile.user_id == current_user.id).first()
        if profile:
            elderly_profile_id = profile.id
            profile_data = profile
    else:
        membership = db.query(CareNetwork).filter(
            CareNetwork.user_id == current_user.id,
            CareNetwork.status == "active"
        ).first()
        if membership:
            elderly_profile_id = membership.elderly_profile_id
            profile_data = db.query(ElderlyProfile).filter(ElderlyProfile.id == elderly_profile_id).first()

    return {
        "user": current_user,
        "elderly_profile_id": elderly_profile_id,
        "elderly_profile": profile_data
    }

@router.post("/demo-switch")
def demo_switch_account(role: str = "elderly", request: Request = None, db: Session = Depends(get_db)):
    """
    Demonstration account switcher to test Margaret (elderly), Anita (caretaker), or Rohan (family).
    Issues valid, tracked sessions.
    """
    target_email = "margaret.sharma@carecircle.demo"
    if role == "caretaker":
        target_email = "anita.devi@carecircle.demo"
    elif role == "family" or role == "family_member":
        target_email = "rohan.sharma@carecircle.demo"

    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Demo account not found. Run seed script.")

    elderly_profile_id = None
    if user.role == "elderly":
        profile = db.query(ElderlyProfile).filter(ElderlyProfile.user_id == user.id).first()
        if profile:
            elderly_profile_id = profile.id
    else:
        membership = db.query(CareNetwork).filter(
            CareNetwork.user_id == user.id,
            CareNetwork.status == "active"
        ).first()
        if membership:
            elderly_profile_id = membership.elderly_profile_id

    access_token, token_jti, expire_dt = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "email": user.email}
    )

    client_ip = request.client.host if request and request.client else "127.0.0.1"
    session_record = UserSession(
        user_id=user.id,
        token_jti=token_jti,
        ip_address=client_ip,
        user_agent="CareCircle-Demo-Switcher",
        expires_at=expire_dt
    )
    db.add(session_record)
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "elderly_profile_id": elderly_profile_id
    }
