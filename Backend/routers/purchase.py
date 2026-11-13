
from datetime import date as DateType
from decimal import Decimal
from typing import Literal

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from sqlalchemy.orm import Session

from .audit import log_create
from deps import get_db
from helpers import calc_gst, get_party, get_system_account
from models import JournalEntry
from posting import post_party_entry
from serializers import entry_to_dict
from .terms_helper import (
    cash_settlement_lines,
    resolve_due_date,
    save_terms,
)


router = APIRouter(
    prefix="/purchase-entries",
    tags=["Purchase"],
)

ZERO = Decimal("0")


# ============================================================
# CREATE PURCHASE ENTRY
# ============================================================

@router.post("")
def create_purchase_entry(
    request: Request,
    entry_date: DateType = Form(...),
    supplier_id: int = Form(...),
    taxable_amount: Decimal = Form(...),
    gst_rate: Decimal = Form(Decimal("0")),
    payment_mode: Literal["cash", "credit"] = Form("credit"),
    credit_days: int = Form(30, ge=0, le=3650),
    due_date: DateType | None = Form(None),
    invoice_no: str | None = Form(None),
    narration: str | None = Form(None),
    files: list[UploadFile | str] = File(default=[]),
    db: Session = Depends(get_db),
):
    # Ignore empty file values
    files = [
        f for f in files
        if not isinstance(f, str)
    ]

    # Get supplier
    supplier = get_party(
        db,
        supplier_id,
        "supplier",
    )

    # Calculate GST
    gst, total = calc_gst(
        taxable_amount,
        gst_rate,
    )

    # Get system accounts
    purchases_acc = get_system_account(
        db,
        "Purchases",
        "expense",
    )

    gst_input = get_system_account(
        db,
        "GST Input",
        "asset",
    )

    # Accounting entries:
    # Dr Purchases
    # Dr GST Input
    # Cr Supplier

    lines = [
        (
            purchases_acc.id,
            taxable_amount,
            ZERO,
        ),
        (
            gst_input.id,
            gst,
            ZERO,
        ),
        (
            supplier.id,
            ZERO,
            total,
        ),
    ]

    # Cash purchase settlement
    if payment_mode == "cash":
        lines += cash_settlement_lines(
            db,
            "purchase",
            supplier,
            total,
        )

    # Post purchase entry
    result = post_party_entry(
        db,
        "purchase",
        entry_date,
        supplier,
        taxable_amount,
        gst_rate,
        gst,
        total,
        invoice_no,
        narration,
        lines,
        files,
    )

    # Calculate due date
    due = resolve_due_date(
        entry_date,
        credit_days,
        due_date,
    )

    # Save payment terms
    save_terms(
        db,
        result,
        "purchase",
        supplier,
        entry_date,
        total,
        invoice_no,
        payment_mode,
        due,
    )

    # Audit log
    log_create(
        db,
        request,
        "purchase",
        result,
    )

    return result


# ============================================================
# PURCHASE REGISTER
# ============================================================

@router.get("")
def purchase_register(
    supplier_id: int | None = None,
    date_from: DateType | None = None,
    date_to: DateType | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(JournalEntry).filter(
        JournalEntry.entry_type == "purchase"
    )

    # Supplier filter
    if supplier_id:
        q = q.filter(
            JournalEntry.party_id == supplier_id
        )

    # Start date filter
    if date_from:
        q = q.filter(
            JournalEntry.date >= date_from
        )

    # End date filter
    if date_to:
        q = q.filter(
            JournalEntry.date <= date_to
        )

    entries = (
        q.order_by(
            JournalEntry.date.desc(),
            JournalEntry.id.desc(),
        )
        .all()
    )

    return [
        entry_to_dict(entry)
        for entry in entries
    ]


# ============================================================
# PURCHASE ENTRY DETAIL
# ============================================================

@router.get("/{entry_id}")
def purchase_entry_detail(
    entry_id: int,
    db: Session = Depends(get_db),
):
    entry = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.id == entry_id,
            JournalEntry.entry_type == "purchase",
        )
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Purchase entry not found",
        )

    # Serialize entry with accounting lines
    data = entry_to_dict(
        entry,
        with_lines=True,
    )

    # Attach supplier details
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
