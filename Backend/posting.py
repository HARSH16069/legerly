"""Shared code that saves a sales/purchase entry.
The sales and purchase routers only decide WHICH debit/credit lines to build;
this file does the saving, balance check and attachments."""
from datetime import date as DateType
from decimal import Decimal

from fastapi import UploadFile
from sqlalchemy.orm import Session

from models import Account, JournalEntry, JournalEntryLine
from helpers import check_negative_balances
from files import save_attachments, validate_files


def post_party_entry(
    db: Session,
    kind: str,                          # "sales" or "purchase"
    entry_date: DateType,
    party: Account,
    taxable: Decimal,
    gst_rate: Decimal,
    gst: Decimal,
    total: Decimal,
    invoice_no: str | None,
    narration: str | None,
    lines: list[tuple[int, Decimal, Decimal]],   # (account_id, debit, credit)
    files: list[UploadFile],
):
    validate_files(files)

    lines = [l for l in lines if l[1] > 0 or l[2] > 0]   # drop zero-GST line

    entry = JournalEntry(
        date=entry_date,
        narration=narration or f"{kind.title()} - {party.name}",
        entry_type=kind,
        party_id=party.id,
        invoice_no=invoice_no,
        taxable_amount=taxable,
        gst_rate=gst_rate,
        gst_amount=gst,
        total_amount=total,
    )
    db.add(entry)
    db.flush()

    for account_id, debit, credit in lines:
        db.add(JournalEntryLine(
            journal_entry_id=entry.id,
            account_id=account_id,
            debit=debit,
            credit=credit,
        ))
    db.flush()

    check_negative_balances(db, {l[0] for l in lines})

    save_attachments(db, entry.id, files)
    db.flush()   # NOT committed here: the router adds the terms and audit record, then commits once
    db.refresh(entry)

    return {
        "message": f"{kind.title()} entry created successfully",
        "journal_entry_id": entry.id,
        "taxable_amount": taxable,
        "gst_amount": gst,
        "total_amount": total,
    }