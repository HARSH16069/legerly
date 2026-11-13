"""Account ledger: every transaction line on one account, with a running balance (like a ledger book)."""
from datetime import date as DateType
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from deps import get_db
from models import Account, JournalEntry, JournalEntryLine

router = APIRouter(prefix="/account-ledger", tags=["Ledger"])   # own path, so it can never clash with another /accounts route
VOUCHER = {"sales": "Sales", "purchase": "Purchase", "journal": "Journal", "payment": "Payment"}


def _fk_attr(model, target):
    """The column on `model` that points at `target` (found automatically)."""
    for col in model.__table__.columns:
        for fk in col.foreign_keys:
            if fk.column.table.name == target.__table__.name:
                return getattr(model, col.key)
    raise RuntimeError(f"{model.__name__} has no foreign key to {target.__name__}")


@router.get("/{account_id}")
def account_ledger(account_id: int, date_from: DateType | None = None, date_to: DateType | None = None,
                   db: Session = Depends(get_db)):
    acc = db.get(Account, account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    entry_col = _fk_attr(JournalEntryLine, JournalEntry)
    sign = 1 if acc.account_type in ("asset", "expense") else -1   # balance grows with debit or with credit
    opening = Decimal(str(acc.opening_balance or 0))

    if date_from:   # balance brought forward from before the period
        d, c = (db.query(func.coalesce(func.sum(JournalEntryLine.debit), 0), func.coalesce(func.sum(JournalEntryLine.credit), 0))
                .select_from(JournalEntryLine).join(JournalEntry, entry_col == JournalEntry.id)
                .filter(JournalEntryLine.account_id == account_id, JournalEntry.date < date_from).one())
        opening += sign * (Decimal(str(d)) - Decimal(str(c)))

    q = (db.query(JournalEntryLine, JournalEntry).join(JournalEntry, entry_col == JournalEntry.id)
         .filter(JournalEntryLine.account_id == account_id))
    if date_from:
        q = q.filter(JournalEntry.date >= date_from)
    if date_to:
        q = q.filter(JournalEntry.date <= date_to)
    pairs = q.order_by(JournalEntry.date, JournalEntry.id, JournalEntryLine.id).all()

    # the other accounts in each entry, shown as "particulars" (for example Sales, GST Payable)
    others, ids = {}, {e.id for _, e in pairs}
    if ids:
        for eid, name in (db.query(entry_col, Account.name).join(Account, Account.id == JournalEntryLine.account_id)
                          .filter(entry_col.in_(ids), JournalEntryLine.account_id != account_id).all()):
            names = others.setdefault(eid, [])
            if name not in names:
                names.append(name)

    bal, tot_dr, tot_cr, rows = opening, Decimal("0"), Decimal("0"), []
    for line, e in pairs:
        dr, cr = Decimal(str(line.debit or 0)), Decimal(str(line.credit or 0))
        bal += sign * (dr - cr)
        tot_dr, tot_cr = tot_dr + dr, tot_cr + cr
        rows.append({
            "date": e.date, "entry_id": e.id, "entry_type": e.entry_type,
            "voucher": VOUCHER.get(e.entry_type, str(e.entry_type).title()),
            "invoice_no": getattr(e, "invoice_no", None), "narration": getattr(e, "narration", None),
            "particulars": others.get(e.id, []), "debit": dr, "credit": cr, "balance": bal,
        })
    return {
        "account": {"id": acc.id, "name": acc.name, "account_type": acc.account_type, "party_type": acc.party_type},
        "date_from": date_from, "date_to": date_to,
        "opening": opening, "total_debit": tot_dr, "total_credit": tot_cr, "closing": bal, "rows": rows,
    }