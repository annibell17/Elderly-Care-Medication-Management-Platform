from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "elderly"  # elderly, family_member, caretaker, doctor
    phone_number: Optional[str] = None
    language_pref: str = "en"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut
    elderly_profile_id: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class ElderlyProfileBase(BaseModel):
    date_of_birth: Optional[str] = None
    blood_type: Optional[str] = None
    primary_language: str = "English"
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    allergies: List[str] = []
    chronic_conditions: List[str] = []
    notes: Optional[str] = None

class ElderlyProfileCreate(ElderlyProfileBase):
    pass

class ElderlyProfileUpdate(ElderlyProfileBase):
    pass

class ElderlyProfileOut(ElderlyProfileBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PermissionBase(BaseModel):
    can_view_medications: bool = True
    can_confirm_medications: bool = False
    can_manage_schedules: bool = False
    can_view_appointments: bool = True
    can_schedule_appointments: bool = False
    can_view_health_records: bool = False
    can_view_analytics: bool = True
    can_receive_escalations: bool = True
    can_write_handover_logs: bool = False

class PermissionUpdate(PermissionBase):
    pass

class PermissionOut(PermissionBase):
    id: str
    care_network_id: str

    class Config:
        from_attributes = True

class CareNetworkMemberOut(BaseModel):
    id: str
    user_id: str
    full_name: str
    email: str
    role: str
    relationship_label: str
    is_primary: bool
    status: str
    added_at: datetime
    permissions: Optional[PermissionOut] = None

    class Config:
        from_attributes = True

class InvitationCreate(BaseModel):
    invited_email: EmailStr
    invited_role: str  # family_member, caretaker
    relationship_label: str
    permissions: Optional[PermissionBase] = None

class InvitationOut(BaseModel):
    id: str
    invited_email: str
    invited_role: str
    relationship_label: str
    invite_code: str
    token: str
    status: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class AcceptInvitationRequest(BaseModel):
    invite_code: str
