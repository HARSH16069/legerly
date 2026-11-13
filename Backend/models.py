from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    Numeric,
    Date,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)

    # asset / liability / income / expense / equity
    account_type = Column(String, nullable=False, index=True)

    # customer / supplier / NULL
    party_type = Column(String, nullable=True, index=True)

    opening_balance = Column(Numeric(15, 2), nullable=False, default=0)
    description = Column(Text, nullable=True)
    allow_negative = Column(Boolean, nullable=False, default=False)

    journal_lines = relationship("JournalEntryLine", back_populates="account")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    narration = Column(Text, nullable=True)

    # general / sales / purchase
    entry_type = Column(String, nullable=False, default="general", index=True)

    # Sales -> customer, Purchase -> supplier
    party_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)
    invoice_no = Column(String, nullable=True)

    taxable_amount = Column(Numeric(15, 2), nullable=True)
    gst_rate = Column(Numeric(5, 2), nullable=True)
    gst_amount = Column(Numeric(15, 2), nullable=True)
    total_amount = Column(Numeric(15, 2), nullable=True)

    party = relationship("Account", foreign_keys=[party_id])

    lines = relationship(
        "JournalEntryLine",
        back_populates="journal_entry",
        cascade="all, delete-orphan",
    )

    attachments = relationship(
        "Attachment",
        back_populates="journal_entry",
        cascade="all, delete-orphan",
    )


class JournalEntryLine(Base):
    __tablename__ = "journal_entry_lines"

    id = Column(Integer, primary_key=True, index=True)

    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)

    debit = Column(Numeric(15, 2), nullable=False, default=0)
    credit = Column(Numeric(15, 2), nullable=False, default=0)

    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", back_populates="journal_lines")


class Attachment(Base):
    """Bill / invoice image or PDF attached to a journal entry."""
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=False, index=True)

    original_name = Column(String, nullable=True)
    stored_name = Column(String, nullable=False)
    content_type = Column(String, nullable=True)

    journal_entry = relationship("JournalEntry", back_populates="attachments")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    item_code = Column(String, unique=True, nullable=True)
    unit = Column(String, nullable=False, default="pcs")

    selling_price = Column(Numeric(15, 2), nullable=False, default=0)
    cost_price = Column(Numeric(15, 2), nullable=False, default=0)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0)


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)

    # "in" / "out"
    movement_type = Column(String, nullable=False)
    quantity = Column(Numeric(15, 3), nullable=False)
    date = Column(Date, nullable=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)