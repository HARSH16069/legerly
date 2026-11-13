from pydantic import BaseModel, Field
from datetime import date as DateType
from decimal import Decimal
from enum import Enum


class AccountType(str, Enum):
    asset = "asset"
    liability = "liability"
    income = "income"
    expense = "expense"
    equity = "equity"  # Capital / drawings


class PartyType(str, Enum):
    customer = "customer"
    supplier = "supplier"
    both = "both"  # for accounts like GST Payable, which can be both


class EntryType(str, Enum):
    general = "general"
    sales = "sales"
    purchase = "purchase"


class AccountCreate(BaseModel):
    name: str
    account_type: AccountType
    party_type: PartyType | None = None
    opening_balance: Decimal = Field(Decimal("0"), decimal_places=2)
    description: str | None = None
    allow_negative: bool | None = None   # None = auto


class ItemCreate(BaseModel):
    name: str
    item_code: str | None = None
    unit: str = "pcs"
    selling_price: Decimal = Decimal("0")
    cost_price: Decimal = Decimal("0")
    tax_rate: Decimal = Decimal("0")


class JournalLineCreate(BaseModel):
    account_id: int
    debit: Decimal = Field(Decimal("0"), ge=0, decimal_places=2)
    credit: Decimal = Field(Decimal("0"), ge=0, decimal_places=2)


class JournalEntryCreate(BaseModel):
    date: DateType
    narration: str | None = None
    lines: list[JournalLineCreate]