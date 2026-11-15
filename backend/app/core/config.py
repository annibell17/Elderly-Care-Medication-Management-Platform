import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "CareCircle"
    PROJECT_DESCRIPTION: str = "Intelligent Elderly Healthcare & Care Coordination Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "carecircle-hackathon-super-secret-key-2026-safe-production-ready")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database: Supports SQLite by default for instant local setup or PostgreSQL when DATABASE_URL is set
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/carecircle.db")
    
    # Email configuration
    EMAIL_PROVIDER: str = os.getenv("EMAIL_PROVIDER", "demo")  # 'demo', 'smtp', 'resend'
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "carecircle@health.local")
    EMAILS_FROM_NAME: str = os.getenv("EMAILS_FROM_NAME", "CareCircle Support")
    
    # Uploads
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    
    # Care Intelligence Escalation Settings (in minutes)
    FOLLOW_UP_INTERVAL_MINUTES: int = int(os.getenv("FOLLOW_UP_INTERVAL_MINUTES", "30"))
    CARETAKER_ESCALATION_MINUTES: int = int(os.getenv("CARETAKER_ESCALATION_MINUTES", "60"))
    FAMILY_ESCALATION_MINUTES: int = int(os.getenv("FAMILY_ESCALATION_MINUTES", "120"))
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
