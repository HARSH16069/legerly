"""Edit and delete entries (every change is written to the audit log), plus manual journals."""
import os
from datetime import date as DateType
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .audit import delete_entry_rows, entry_kind, fk_key, has_payments, log, replace_lines, snap
from deps import get_db
from files import UPLOAD_DIR
from helpers import calc_gst, check_negative_balances, get_party, get_system_account
from models import Account, JournalEntry, JournalEntryLine
from .models_terms import EntryTerms
from .terms_helper import cash_settlement_lines, paid_map, resolve_due_date

router = APIRouter(tags=["Edit and delete"])
ZERO = Decimal("0")


def get_entry(db, entry_id, kind=None):
    e = db.get(JournalEntry, entry_id)
    if not e:
        raise HTTPException(404, "Entry not found")
    if kind and entry_kind(e) != kind:
        raise HTTPException(400, f"Entry #{entry_id} is not a {kind} entry")
    return e


def apply(entry, **vals):
    cols = JournalEntry.__table__.columns.keys()
    for k, v in vals.items():
        if k in cols:
            setattr(entry, k, v)


# ---------------- edit sales / purchase ----------------
def party_lines(db, kind, party, taxable, rate, mode):
    gst, total = calc_gst(taxable, rate)
    if kind == "sales":
        sales, gp = get_system_account(db, "Sales", "income"), get_system_account(db, "GST Payable", "liability")
        lines = [(party.id, total, ZERO), (sales.id, ZERO, taxable), (gp.id, ZERO, gst)]
    else:
        pur, gi = get_system_account(db, "Purchases", "expense"), get_system_account(db, "GST Input", "asset")
        lines = [(pur.id, taxable, ZERO), (gi.id, gst, ZERO), (party.id, ZERO, total)]
    if mode == "cash":
        lines += cash_settlement_lines(db, kind, party, total)
    return lines, gst, total


def edit_party_entry(db, request, kind, entry_id, party_id, entry_date, taxable, rate, mode,
                     credit_days, due_date, invoice_no, narration, reason):
    entry = get_entry(db, entry_id, kind)
    before = snap(db, entry)
    party = get_party(db, party_id, "customer" if kind == "sales" else "supplier")
    lines, gst, total = party_lines(db, kind, party, taxable, rate, mode)

    # Money already received / paid must still make sense after the edit.
    t0 = db.query(EntryTerms).filter(EntryTerms.entry_id == entry.id).first()
    paid = paid_map(db, [t0.id]).get(t0.id, ZERO) if t0 else ZERO
    if paid > 0:
        if party.id != entry.party_id:
            raise HTTPException(400, "Payments are recorded against this entry, so the customer/supplier can’t be changed. Remove the payments first.")
        if mode == "cash" or total < paid:
            raise HTTPException(400, f"{paid} has already been settled on this entry, so it can’t become cash or be reduced below that amount.")
    lk = fk_key(JournalEntryLine, JournalEntry)
    old_ids = {l.account_id for l in db.query(JournalEntryLine).filter(getattr(JournalEntryLine, lk) == entry.id)}

    apply(entry, date=entry_date, party_id=party.id, taxable_amount=taxable, gst_rate=rate,
          gst_amount=gst, total_amount=total)
    if invoice_no is not None:
        apply(entry, invoice_no=invoice_no)
    if narration is not None:
        apply(entry, narration=narration)
    replace_lines(db, entry, lines)
    check_negative_balances(db, old_ids | {l[0] for l in lines})   # same balance rule as when the entry was first posted

    t = db.query(EntryTerms).filter(EntryTerms.entry_id == entry.id).first()
    if not t:
        t = EntryTerms(entry_id=entry.id, entry_type=kind, payment_mode=mode, entry_date=entry_date, total=total, is_paid=False)
        db.add(t)
    was_cash = t.payment_mode == "cash"
    t.party_id, t.party_name, t.entry_date, t.total, t.payment_mode = party.id, party.name, entry_date, total, mode
    if invoice_no is not None:
        t.invoice_no = invoice_no
    if mode == "cash":
        t.due_date, t.is_paid, t.paid_on = None, True, entry_date
    else:
        t.due_date = resolve_due_date(entry_date, credit_days, due_date)
        if was_cash:
            t.is_paid, t.paid_on = False, None
    db.flush()
    after = snap(db, entry)
    log(db, request, "update", kind, entry.id, before=before, after=after, reason=reason)
    db.commit()
    return after


@router.put("/sales-entries/{entry_id}")
def edit_sale(
    request: Request, entry_id: int,
    entry_date: DateType = Form(...), customer_id: int = Form(...), taxable_amount: Decimal = Form(...),
    gst_rate: Decimal = Form(Decimal("0")), payment_mode: Literal["cash", "credit"] = Form("credit"),
    credit_days: int = Form(30, ge=0, le=3650), due_date: DateType | None = Form(None),
    invoice_no: str | None = Form(None), narration: str | None = Form(None), reason: str | None = Form(None),
    db: Session = Depends(get_db),
):
    return edit_party_entry(db, request, "sales", entry_id, customer_id, entry_date, taxable_amount, gst_rate,
                            payment_mode, credit_days, due_date, invoice_no, narration, reason)


@router.put("/purchase-entries/{entry_id}")
def edit_purchase(
    request: Request, entry_id: int,
    entry_date: DateType = Form(...), supplier_id: int = Form(...), taxable_amount: Decimal = Form(...),
    gst_rate: Decimal = Form(Decimal("0")), payment_mode: Literal["cash", "credit"] = Form("credit"),
    credit_days: int = Form(30, ge=0, le=3650), due_date: DateType | None = Form(None),
    invoice_no: str | None = Form(None), narration: str | None = Form(None), reason: str | None = Form(None),
    db: Session = Depends(get_db),
):
    return edit_party_entry(db, request, "purchase", entry_id, supplier_id, entry_date, taxable_amount, gst_rate,
                            payment_mode, credit_days, due_date, invoice_no, narration, reason)


# ---------------- delete any entry ----------------
@router.delete("/entries/{entry_id}")
def delete_entry(request: Request, entry_id: int, reason: str = Query(..., min_length=3),
                 db: Session = Depends(get_db)):
    entry = get_entry(db, entry_id)
    if entry.entry_type == "payment":
        raise HTTPException(400, "This is a payment entry. Remove it from the Payments screen instead.")
    if has_payments(db, entry_id):
        raise HTTPException(409, "Payments are recorded against this entry. Remove them first, then delete it.")
    kind = entry_kind(entry)
    before = snap(db, entry)
    files = delete_entry_rows(db, entry)
    log(db, request, "delete", kind, entry_id, before=before, reason=reason)
    db.commit()
    # bill files stay on disk so that Undo can bring the entry back with its bills
    return {"message": f"Entry #{entry_id} deleted"}


# ---------------- manual journal entries ----------------
class JLine(BaseModel):
    account_id: int
    debit: Decimal = Field(ZERO, ge=0, decimal_places=2)
    credit: Decimal = Field(ZERO, ge=0, decimal_places=2)


class JBody(BaseModel):
    date: DateType
    narration: str | None = None
    reference: str | None = None
    reason: str | None = None
    lines: list[JLine]


def check_journal(db, body: JBody):
    if len(body.lines) < 2:
        raise HTTPException(400, "A journal entry needs at least two lines")
    for l in body.lines:
        if l.debit < 0 or l.credit < 0:
            raise HTTPException(400, "Debit and credit cannot be negative")
        if (l.debit > 0) == (l.credit > 0):
            raise HTTPException(400, "Each line must have either a debit or a credit")
        if not db.get(Account, l.account_id):
            raise HTTPException(400, f"Account {l.account_id} not found")
    dr, cr = sum((l.debit for l in body.lines), ZERO), sum((l.credit for l in body.lines), ZERO)
    if dr != cr:
        raise HTTPException(400, f"Debits ({dr}) and credits ({cr}) must be equal")
    return dr


def journal_fields(body, total):
    return dict(date=body.date, narration=body.narration, invoice_no=body.reference,
                taxable_amount=total, gst_rate=ZERO, gst_amount=ZERO, total_amount=total)


@router.post("/manual-journal")
def create_journal(request: Request, body: JBody, db: Session = Depends(get_db)):
    total = check_journal(db, body)
    cols = JournalEntry.__table__.columns.keys()
    vals = {**journal_fields(body, total), "entry_type": "journal", "party_id": None}
    entry = JournalEntry(**{k: v for k, v in vals.items() if k in cols})
    db.add(entry)
    db.flush()
    replace_lines(db, entry, [(l.account_id, l.debit, l.credit) for l in body.lines])
    check_negative_balances(db, {l.account_id for l in body.lines})
    after = snap(db, entry)
    log(db, request, "create", "journal", entry.id, after=after, reason=body.reason)
    db.commit()
    return {"id": entry.id, "journal_entry_id": entry.id, "total_amount": total}


@router.put("/manual-journal/{entry_id}")
def edit_journal(request: Request, entry_id: int, body: JBody, db: Session = Depends(get_db)):
    entry = get_entry(db, entry_id, "journal")
    total = check_journal(db, body)
    before = snap(db, entry)
    lk = fk_key(JournalEntryLine, JournalEntry)
    old_ids = {l.account_id for l in db.query(JournalEntryLine).filter(getattr(JournalEntryLine, lk) == entry.id)}
    apply(entry, **journal_fields(body, total))
    replace_lines(db, entry, [(l.account_id, l.debit, l.credit) for l in body.lines])
    check_negative_balances(db, old_ids | {l.account_id for l in body.lines})
    after = snap(db, entry)
    log(db, request, "update", "journal", entry.id, before=before, after=after, reason=body.reason)
    db.commit()
    return {"id": entry.id, "total_amount": total}


@router.get("/manual-journal")
def list_journals(db: Session = Depends(get_db)):
    lk = fk_key(JournalEntryLine, JournalEntry)
    q = db.query(JournalEntry).filter(JournalEntry.entry_type == "journal")
    out = []
    for e in q.order_by(JournalEntry.date.desc(), JournalEntry.id.desc()).limit(100).all():
        ls = db.query(JournalEntryLine).filter(getattr(JournalEntryLine, lk) == e.id).all()
        out.append({"id": e.id, "date": e.date, "narration": getattr(e, "narration", None),
                    "reference": getattr(e, "invoice_no", None),
                    "total": sum((l.debit for l in ls), ZERO), "lines": len(ls)})
    return out


@router.get("/manual-journal/{entry_id}")
def get_journal(entry_id: int, db: Session = Depends(get_db)):
    e = get_entry(db, entry_id, "journal")
    lk = fk_key(JournalEntryLine, JournalEntry)
    ls = db.query(JournalEntryLine).filter(getattr(JournalEntryLine, lk) == e.id).all()
    return {"id": e.id, "date": e.date, "narration": getattr(e, "narration", None),
            "reference": getattr(e, "invoice_no", None),
            "lines": [{"account_id": l.account_id, "debit": l.debit, "credit": l.credit} for l in ls]}