import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Integer, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    elderly_profile_id = Column(String(36), ForeignKey("elderly_profiles.id"), nullable=False)
    uploaded_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    document_type = Column(String(50), default="prescription")  # prescription, lab_report, discharge_summary, imaging, other
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/pdf")
    
    # OCR features
    ocr_extracted_text = Column(Text, nullable=True)
    ocr_parsed_data = Column(JSON, default=dict)
    ocr_confidence = Column(Float, default=0.0)
    
    notes = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    elderly_profile = relationship("ElderlyProfile", back_populates="medical_documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
