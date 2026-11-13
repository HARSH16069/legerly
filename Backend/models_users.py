"""Businesses and staff accounts. These live in the MAIN database only.
Add `import models_users  # noqa: F401` in main.py so the tables are created."""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from database import MasterBase, utcnow


class Business(MasterBase):
    __tablename__ = "businesses"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    db_name = Column(String(100), unique=True)          # biz_<id>: this business's own database
    created_at = Column(DateTime, default=utcnow)


class User(MasterBase):
    __tablename__ = "app_users"
    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)   # unique across all businesses
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False, default="sales")   # owner | admin | accountant | sales
    is_active = Column(Boolean, default=True)                    # false = switched off
    created_at = Column(DateTime, default=utcnow)
    last_login = Column(DateTime)