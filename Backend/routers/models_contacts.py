"""Vendor (purchase side) and Customer (sale side) master data.

Add `import models_contacts  # noqa: F401` in main.py so the tables are created.
Each Vendor/Customer is linked to an Account row (account_id) - that account is
what you pass as supplier_id / customer_id when posting purchase / sales entries.
"""
from datetime import datetime

from sqlalchemy import (JSON, Boolean, Column, DateTime, ForeignKey, Integer,
                        String, Text)
from sqlalchemy.orm import relationship

from database import Base


class PartyMixin:
    id = Column(Integer, primary_key=True, index=True)

    # --- top of the form ---
    salutation = Column(String(10))
    first_name = Column(String(100))
    last_name = Column(String(100))
    company_name = Column(String(200))
    display_name = Column(String(200), nullable=False, unique=True)  # required*
    email = Column(String(200))
    work_phone = Column(String(30))
    mobile = Column(String(30))
    language = Column(String(50), default="English")

    # --- "Other Details" tab ---
    gstin = Column(String(20))
    pan = Column(String(20))
    msme_registered = Column(Boolean, default=False)
    currency = Column(String(10), default="INR")

    # --- other tabs ---
    custom_fields = Column(JSON, default=dict)      # {"field": "value"}
    reporting_tags = Column(JSON, default=dict)     # {"tag": "value"}
    remarks = Column(Text)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Vendor(PartyMixin, Base):
    __tablename__ = "vendors"
    account_id = Column(Integer, ForeignKey("accounts.id"), unique=True, nullable=False)

    addresses = relationship("Address", back_populates="vendor", cascade="all, delete-orphan")
    contact_persons = relationship("ContactPerson", back_populates="vendor", cascade="all, delete-orphan")
    bank_details = relationship("BankDetail", back_populates="vendor", cascade="all, delete-orphan")


class Customer(PartyMixin, Base):
    __tablename__ = "customers"
    account_id = Column(Integer, ForeignKey("accounts.id"), unique=True, nullable=False)

    addresses = relationship("Address", back_populates="customer", cascade="all, delete-orphan")
    contact_persons = relationship("ContactPerson", back_populates="customer", cascade="all, delete-orphan")
    bank_details = relationship("BankDetail", back_populates="customer", cascade="all, delete-orphan")


# Child tables: each row belongs to either a vendor OR a customer.
class Address(Base):
    __tablename__ = "party_addresses"
    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    address_type = Column(String(10), nullable=False)   # billing | shipping
    attention = Column(String(200))
    country = Column(String(100), default="India")
    street1 = Column(String(300))
    street2 = Column(String(300))
    city = Column(String(100))
    state = Column(String(100))
    pin_code = Column(String(15))
    phone = Column(String(30))

    vendor = relationship("Vendor", back_populates="addresses")
    customer = relationship("Customer", back_populates="addresses")


class ContactPerson(Base):
    __tablename__ = "party_contact_persons"
    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    salutation = Column(String(10))
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(200))
    work_phone = Column(String(30))
    mobile = Column(String(30))

    vendor = relationship("Vendor", back_populates="contact_persons")
    customer = relationship("Customer", back_populates="contact_persons")


class BankDetail(Base):
    __tablename__ = "party_bank_details"
    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    account_holder_name = Column(String(200))
    bank_name = Column(String(200))
    account_number = Column(String(50))
    ifsc = Column(String(20))

    vendor = relationship("Vendor", back_populates="bank_details")
    customer = relationship("Customer", back_populates="bank_details")
