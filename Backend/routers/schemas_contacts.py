import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

GSTIN = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
PAN = re.compile(r"^[A-Z]{5}\d{4}[A-Z]$")
IFSC = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")


def _check(value, pattern, label):
    """Blank -> None. Otherwise upper-case it and make sure the format is right."""
    if value is None or not value.strip():
        return None
    v = value.strip().upper().replace(" ", "")
    if not pattern.match(v):
        raise ValueError(f"{label} is not in the correct format")
    return v


class AddressIn(BaseModel):
    address_type: Literal["billing", "shipping"]
    attention: str | None = None
    country: str | None = "India"
    street1: str | None = None
    street2: str | None = None
    city: str | None = None
    state: str | None = None
    pin_code: str | None = None
    phone: str | None = None


class ContactPersonIn(BaseModel):
    salutation: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    work_phone: str | None = None
    mobile: str | None = None


class BankDetailIn(BaseModel):
    account_holder_name: str | None = None
    bank_name: str | None = None
    account_number: str | None = None
    ifsc: str | None = None

    @field_validator("ifsc")
    @classmethod
    def _ifsc(cls, v):
        return _check(v, IFSC, "IFSC")


class PartyIn(BaseModel):
    """Body for both New Vendor and New Customer forms."""
    salutation: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    company_name: str | None = None
    display_name: str = Field(..., min_length=1)       # required
    email: str | None = None
    work_phone: str | None = None
    mobile: str | None = None
    language: str = "English"

    gstin: str | None = None
    pan: str | None = None
    msme_registered: bool = False
    currency: str = "INR"

    addresses: list[AddressIn] = []
    contact_persons: list[ContactPersonIn] = []
    bank_details: list[BankDetailIn] = []
    custom_fields: dict = {}
    reporting_tags: dict = {}
    remarks: str | None = None

    @field_validator("gstin")
    @classmethod
    def _gstin(cls, v):
        return _check(v, GSTIN, "GSTIN")

    @field_validator("pan")
    @classmethod
    def _pan(cls, v):
        return _check(v, PAN, "PAN")