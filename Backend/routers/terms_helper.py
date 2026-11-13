from datetime import date, timedelta

from decimal import Decimal

from sqlalchemy import func

from helpers import get_system_account
from models import JournalEntry
from .models_terms import EntryTerms, Payment

ZERO = 0


def cash_settlement_lines(db, entry_type, party, total):
    """Extra journal lines that settle the party at once for cash entries.
    Sales:    Dr Cash | Cr Customer     Purchase: Dr Supplier | Cr Cash"""
    cash = get_system_account(db, "Cash", "asset")
    if entry_type == "sales":
        return [(cash.id, total, ZERO), (party.id, ZERO, total)]
    return [(party.id, total, ZERO), (cash.id, ZERO, total)]


def resolve_due_date(entry_date, credit_days, due_date):
    return due_date or entry_date + timedelta(days=credit_days)


def save_terms(db, result, entry_type, party, entry_date, total, invoice_no,
               payment_mode, due_date):
    entry_id = (result.get("id") or result.get("journal_entry_id")) if isinstance(result, dict) else getattr(result, "id", None)
    db.add(EntryTerms(
        entry_id=entry_id, entry_type=entry_type, party_id=party.id,
        party_name=party.name, invoice_no=invoice_no, entry_date=entry_date,
        total=total, payment_mode=payment_mode,
        due_date=due_date if payment_mode == "credit" else None,
        is_paid=payment_mode == "cash",
        paid_on=entry_date if payment_mode == "cash" else None,
    ))
    db.flush()   # committed together with the entry and its audit record (see audit.log_create)
    return result


def paid_map(db, terms_ids):
    """{terms_id: amount settled so far}. A payment only counts while its ledger entry still exists."""
    if not terms_ids:
        return {}
    q = (db.query(Payment.terms_id, func.sum(Payment.amount))
         .filter(Payment.terms_id.in_(terms_ids), Payment.journal_entry_id.in_(db.query(JournalEntry.id)))
         .group_by(Payment.terms_id))
    return {t: Decimal(str(total)) for t, total in q.all()}