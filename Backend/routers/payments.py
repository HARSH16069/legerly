"""Receive money from customers / pay suppliers against credit entries (full or part payments)."""
from datetime import date as DateType
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .audit import delete_entry_rows, log, replace_lines, snap
from deps import get_db
from models import Account, JournalEntry
from .models_terms import EntryTerms, Payment
from .terms_helper import paid_map

router = APIRouter(prefix="/payments", tags=["Payments"])
ZERO = Decimal("0")


class PayIn(BaseModel):
    terms_id: int
    amount: Decimal = Field(gt=0, decimal_places=2)
    date: DateType
    account_id: int          # where the money went: Cash, Bank, or any other account (for example Furniture)
    note: str | None = None  # cheque number, UPI reference, "sofa taken in exchange", ...


@router.post("")
def record_payment(request: Request, body: PayIn, db: Session = Depends(get_db)):
    t = db.get(EntryTerms, body.terms_id, with_for_update=True)   # locked, so two simultaneous payments cannot overpay
    if not t:
        raise HTTPException(404, "Entry not found")
    if t.payment_mode != "credit":
        raise HTTPException(400, "This was a cash entry, so nothing is due on it")
    due = Decimal(str(t.total)) - paid_map(db, [t.id]).get(t.id, ZERO)
    if body.amount > due:
        raise HTTPException(400, f"The amount is more than the balance due ({due})")
    acc = db.get(Account, body.account_id)
    if not acc:
        raise HTTPException(400, "Choose the account the money went to")
    if acc.id == t.party_id:
        raise HTTPException(400, "Choose an account other than the customer or supplier's own account")

    inflow = t.entry_type == "sales"
    amt = body.amount
    lines = [(acc.id, amt, ZERO), (t.party_id, ZERO, amt)] if inflow else [(t.party_id, amt, ZERO), (acc.id, ZERO, amt)]
    narration = f"{'Received from' if inflow else 'Paid to'} {t.party_name}"
    if t.invoice_no:
        narration += f" against {t.invoice_no}"
    narration += f" via {acc.name}" + (f" ({body.note})" if body.note else "")

    cols = JournalEntry.__table__.columns.keys()
    vals = {"date": body.date, "entry_type": "payment", "party_id": t.party_id, "narration": narration,
            "invoice_no": t.invoice_no, "taxable_amount": amt, "gst_rate": ZERO, "gst_amount": ZERO, "total_amount": amt}
    je = JournalEntry(**{k: v for k, v in vals.items() if k in cols})
    db.add(je)
    db.flush()
    replace_lines(db, je, lines)
    db.add(Payment(terms_id=t.id, journal_entry_id=je.id, amount=amt, pay_date=body.date,
                   account_id=acc.id, method=acc.name, note=body.note))
    left = due - amt
    if left <= 0:
        t.is_paid, t.paid_on = True, body.date
    db.flush()
    try:
        log(db, request, "create", "journal", je.id, after=snap(db, je), reason=narration[:290])
    except Exception:
        pass
    db.commit()
    return {"payment_journal_entry_id": je.id, "paid": amt, "outstanding": left, "is_paid": left <= 0}


@router.get("")
def list_payments(terms_id: int, db: Session = Depends(get_db)):
    q = (db.query(Payment).filter(Payment.terms_id == terms_id, Payment.journal_entry_id.in_(db.query(JournalEntry.id)))
         .order_by(Payment.pay_date, Payment.id))
    return [{"id": p.id, "date": p.pay_date, "amount": p.amount, "account": p.method, "note": p.note,
             "journal_entry_id": p.journal_entry_id} for p in q.all()]


@router.delete("/{payment_id}")
def remove_payment(request: Request, payment_id: int, reason: str | None = None, db: Session = Depends(get_db)):
    """Reverses a payment that was recorded by mistake. The ledger entry is removed and the balance due returns."""
    p = db.get(Payment, payment_id)
    if not p:
        raise HTTPException(404, "Payment not found")
    je = db.get(JournalEntry, p.journal_entry_id)
    before = None
    if je:
        try:
            before = snap(db, je)
        except Exception:
            before = None
        delete_entry_rows(db, je)
    t = db.get(EntryTerms, p.terms_id)
    db.delete(p)
    db.flush()
    if t:
        left = Decimal(str(t.total)) - paid_map(db, [t.id]).get(t.id, ZERO)
        t.is_paid = left <= 0
        if not t.is_paid:
            t.paid_on = None
    if before is not None:
        try:
            log(db, request, "delete", "journal", p.journal_entry_id, before=before, reason=reason or "Payment removed")
        except Exception:
            pass
    db.commit()
    return {"message": "Payment removed"}