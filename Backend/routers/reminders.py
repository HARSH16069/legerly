from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from deps import get_db
from .models_terms import EntryTerms
from .terms_helper import paid_map

router = APIRouter(prefix="/reminders", tags=["Reminders"])
ZERO = Decimal("0")


def _row(t: EntryTerms, today: date, paid: Decimal):
    days = (t.due_date - today).days
    return {
        "id": t.id, "entry_id": t.entry_id, "entry_type": t.entry_type,
        "action": "collect" if t.entry_type == "sales" else "pay",
        "party_id": t.party_id, "party_name": t.party_name,
        "invoice_no": t.invoice_no, "entry_date": t.entry_date, "due_date": t.due_date,
        "total": t.total, "paid": paid,
        "amount": Decimal(str(t.total)) - paid,          # what is still due
        "status": "overdue" if days < 0 else "due_today" if days == 0 else "due_soon",
        "days_overdue": -days if days < 0 else 0,
        "days_left": days if days >= 0 else 0,
    }


@router.get("")
def reminders(days: int = 7, db: Session = Depends(get_db)):
    """Unpaid credit entries that are overdue or fall due within `days` days. Amounts are the balance still due."""
    today = date.today()
    q = db.query(EntryTerms).filter(
        EntryTerms.payment_mode == "credit",
        EntryTerms.is_paid.is_(False),
        EntryTerms.due_date <= today + timedelta(days=days),
    ).order_by(EntryTerms.due_date)
    terms = q.all()
    pm = paid_map(db, [t.id for t in terms])
    items = [r for r in (_row(t, today, pm.get(t.id, ZERO)) for t in terms) if r["amount"] > 0]
    total = lambda kind, st=None: sum((i["amount"] for i in items if i["entry_type"] == kind and (st is None or i["status"] == st)), ZERO)
    return {
        "as_of": today,
        "summary": {
            "to_collect": total("sales"), "to_collect_overdue": total("sales", "overdue"),
            "to_pay": total("purchase"), "to_pay_overdue": total("purchase", "overdue"),
            "overdue_count": sum(1 for i in items if i["status"] == "overdue"),
        },
        "receivables": [i for i in items if i["entry_type"] == "sales"],
        "payables": [i for i in items if i["entry_type"] == "purchase"],
    }


@router.get("/terms")
def all_terms(payment_mode: str | None = None, entry_type: str | None = None,
              unpaid_only: bool = False, db: Session = Depends(get_db)):
    """Every entry with its cash/credit mode, due date and how much has been settled."""
    q = db.query(EntryTerms)
    if payment_mode:
        q = q.filter(EntryTerms.payment_mode == payment_mode)
    if entry_type:
        q = q.filter(EntryTerms.entry_type == entry_type)
    if unpaid_only:
        q = q.filter(EntryTerms.is_paid.is_(False))
    rows = q.order_by(EntryTerms.entry_date.desc(), EntryTerms.id.desc()).all()
    pm = paid_map(db, [t.id for t in rows])
    out = []
    for t in rows:
        d = {c.key: getattr(t, c.key) for c in EntryTerms.__table__.columns}
        paid = pm.get(t.id, ZERO)
        d["paid_amount"], d["outstanding"] = paid, Decimal(str(t.total)) - paid
        d["is_paid"] = bool(t.is_paid) or d["outstanding"] <= 0
        out.append(d)
    return out


@router.patch("/{terms_id}/paid")
def mark_paid(terms_id: int, db: Session = Depends(get_db)):
    """Old shortcut that only clears the reminder. Use POST /payments to record real money instead."""
    t = db.get(EntryTerms, terms_id)
    if not t:
        raise HTTPException(404, "Entry not found")
    t.is_paid, t.paid_on = True, date.today()
    db.commit()
    return {"message": "Marked as paid", "id": t.id}