"""Cash / credit terms for every sales and purchase entry (used for reminders).
Make sure this module is imported (e.g. by the reminders router or main.py) so the table is created."""
from sqlalchemy import Boolean, Column, Date, DateTime, Integer, Numeric, String

from database import Base, utcnow


class EntryTerms(Base):
    __tablename__ = "entry_terms"
    id = Column(Integer, primary_key=True)
    entry_id = Column(Integer, index=True)           # journal entry id
    entry_type = Column(String(10), nullable=False)  # sales | purchase
    party_id = Column(Integer, index=True)           # customer / supplier account id
    party_name = Column(String(200))
    invoice_no = Column(String(100))
    entry_date = Column(Date, nullable=False)
    total = Column(Numeric(14, 2), nullable=False)
    payment_mode = Column(String(10), nullable=False)  # cash | credit
    due_date = Column(Date)                            # only for credit
    is_paid = Column(Boolean, default=False)
    paid_on = Column(Date)
    created_at = Column(DateTime, default=utcnow)


class Payment(Base):
    """Money received from a customer or paid to a supplier against one credit entry."""
    __tablename__ = "entry_payments"
    id = Column(Integer, primary_key=True)
    terms_id = Column(Integer, index=True)           # entry_terms.id this payment settles
    journal_entry_id = Column(Integer, index=True)   # the ledger entry that was posted
    amount = Column(Numeric(14, 2), nullable=False)
    pay_date = Column(Date, nullable=False)
    account_id = Column(Integer)                     # cash / bank / other account used
    method = Column(String(200))                     # name of that account, kept for reading
    note = Column(String(300))
    created_at = Column(DateTime, default=utcnow)