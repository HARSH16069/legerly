from datetime import date as DateType
from decimal import Decimal
from typing import Literal
from fastapi import HTTPException
from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.orm import Session

from .audit import log_create
from deps import get_db
from helpers import calc_gst, get_party, get_system_account
from models import JournalEntry
from posting import post_party_entry
from serializers import entry_to_dict
from .terms_helper import cash_settlement_lines, resolve_due_date, save_terms

router = APIRouter(prefix="/sales-entries", tags=["Sales"])

ZERO = Decimal("0")


@router.post("")
def create_sales_entry(
    request: Request,
    entry_date: DateType = Form(...),
    customer_id: int = Form(...),
    taxable_amount: Decimal = Form(...),
    gst_rate: Decimal = Form(Decimal("0")),
    payment_mode: Literal["cash", "credit"] = Form("credit"),
    credit_days: int = Form(30, ge=0, le=3650),                     # used when credit and no due_date
    due_date: DateType | None = Form(None),
    invoice_no: str | None = Form(None),
    narration: str | None = Form(None),
    files: list[UploadFile | str] = File(default=[]),
    db: Session = Depends(get_db),
):
    files = [f for f in files if not isinstance(f, str)]   # ignore empty values
    customer = get_party(db, customer_id, "customer")
    gst, total = calc_gst(taxable_amount, gst_rate)

    sales_acc = get_system_account(db, "Sales", "income")
    gst_payable = get_system_account(db, "GST Payable", "liability")

    # Dr Customer (total) | Cr Sales (taxable) | Cr GST Payable (gst)
    lines = [
        (customer.id, total, ZERO),
        (sales_acc.id, ZERO, taxable_amount),
        (gst_payable.id, ZERO, gst),
    ]
    # Cash sale: money is received now, so the customer is settled straight away
    if payment_mode == "cash":
        lines += cash_settlement_lines(db, "sales", customer, total)

    result = post_party_entry(
        db, "sales", entry_date, customer, taxable_amount, gst_rate, gst, total,
        invoice_no, narration, lines, files,
    )
    due = resolve_due_date(entry_date, credit_days, due_date)
    save_terms(db, result, "sales", customer, entry_date, total, invoice_no, payment_mode, due)
    log_create(db, request, "sales", result)
    return result


@router.get("")
def sales_register(
    customer_id: int | None = None,
    date_from: DateType | None = None,
    date_to: DateType | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(JournalEntry).filter(JournalEntry.entry_type == "sales")
    if customer_id:
        q = q.filter(JournalEntry.party_id == customer_id)
    if date_from:
        q = q.filter(JournalEntry.date >= date_from)
    if date_to:
        q = q.filter(JournalEntry.date <= date_to)
    entries = q.order_by(JournalEntry.date.desc(), JournalEntry.id.desc()).all()
    return [entry_to_dict(e) for e in entries]
@router.get("/{entry_id}")
def sales_entry_detail(
    entry_id: int,
    db: Session = Depends(get_db),
):
    entry = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.id == entry_id,
            JournalEntry.entry_type == "sales",
        )
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Sales entry not found",
        )

    data = entry_to_dict(entry, with_lines=True)

    data["party"] = (
        {
            "id": entry.party.id,
            "name": entry.party.name,
            "account_type": entry.party.account_type,
            "party_type": entry.party.party_type,
            "opening_balance": entry.party.opening_balance,
            "description": entry.party.description,
        }
        if entry.party
        else None
    )

    return data