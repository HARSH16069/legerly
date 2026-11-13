"""Audit trail table. Import it as `routers.models_audit` everywhere (never under a second name)."""
from sqlalchemy import Column, DateTime, Integer, String, Text

from database import Base, utcnow


class AuditLog(Base):
    __tablename__ = "audit_trail"
    id = Column(Integer, primary_key=True)
    at = Column(DateTime, default=utcnow, index=True)   # stored in UTC
    user = Column(String(100), default="unknown")
    user_id = Column(Integer, index=True)              # who did it (main-database user id)
    action = Column(String(10), nullable=False)        # create | update | delete
    entity_type = Column(String(20), nullable=False)   # sales | purchase | journal
    entity_id = Column(Integer, index=True)            # journal entry id
    summary = Column(String(300))
    reason = Column(String(300))
    before_json = Column(Text)
    after_json = Column(Text)