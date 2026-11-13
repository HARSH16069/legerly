"""Financial reports: Profit & Loss and Balance Sheet.

Save as routers/reports.py and add in main.py:
    from routers import reports
    app.include_router(reports.router)

  GET /reports/profit-loss?date_from=&date_to=&compare=true
  GET /reports/balance-sheet?as_on=
"""
from datetime import date as DateType, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from deps import get_db
from models import Account, JournalEntry, JournalEntryLine

router = APIRouter(prefix="/reports", tags=["Reports"])

ZERO = Decimal("0")
DEBIT_NORMAL = ("asset", "expense")


def _d(v) -> Decimal:
    return Decimal(str(v or 0))


def _movement(db: Session, date_from: DateType | None, date_to: DateType | None) -> dict:
    """{account_id: (total_debit, total_credit)} for entries inside the dates."""
    q = (
        db.query(
            JournalEntryLine.account_id,
            func.coalesce(func.sum(JournalEntryLine.debit), 0),
            func.coalesce(func.sum(JournalEntryLine.credit), 0),
        )
        .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
    )
    if date_from:
        q = q.filter(JournalEntry.date >= date_from)
    if date_to:
        q = q.filter(JournalEntry.date <= date_to)
    return {a: (_d(dr), _d(cr)) for a, dr, cr in q.group_by(JournalEntryLine.account_id).all()}


def _section(accounts, current: dict, previous: dict | None, kind: str, hide_zero: bool) -> dict:
    rows = []
    for acc in accounts:
        if acc.account_type != kind:
            continue
        dr, cr = current.get(acc.id, (ZERO, ZERO))
        amount = cr - dr if kind == "income" else dr - cr
        prev = None
        if previous is not None:
            pdr, pcr = previous.get(acc.id, (ZERO, ZERO))
            prev = pcr - pdr if kind == "income" else pdr - pcr
        if hide_zero and amount == 0 and not prev:
            continue
        rows.append({"account_id": acc.id, "account_name": acc.name, "amount": amount, "previous": prev})
    return {
        "rows": rows,
        "total": sum((r["amount"] for r in rows), ZERO),
        "previous_total": sum((r["previous"] or ZERO for r in rows), ZERO) if previous is not None else None,
    }


@router.get("/profit-loss")
def profit_loss(
    date_from: DateType | None = None,
    date_to: DateType | None = None,
    compare: bool = False,
    hide_zero: bool = True,
    db: Session = Depends(get_db),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(400, "'From' date cannot be after 'To' date")

    accounts = (
        db.query(Account)
        .filter(Account.account_type.in_(("income", "expense")))
        .order_by(Account.name)
        .all()
    )
    current = _movement(db, date_from, date_to)

    prev_from = prev_to = None
    previous = None
    if compare and date_from and date_to:      # same-length period just before this one
        prev_to = date_from - timedelta(days=1)
        prev_from = prev_to - (date_to - date_from)
        previous = _movement(db, prev_from, prev_to)

    income = _section(accounts, current, previous, "income", hide_zero)
    expenses = _section(accounts, current, previous, "expense", hide_zero)
    net = income["total"] - expenses["total"]
    prev_net = None
    if previous is not None:
        prev_net = income["previous_total"] - expenses["previous_total"]

    return {
        "date_from": date_from, "date_to": date_to,
        "previous_from": prev_from, "previous_to": prev_to,
        "income": income, "expenses": expenses,
        "net_profit": net, "previous_net_profit": prev_net,
        "margin": float(net / income["total"] * 100) if income["total"] else 0.0,
    }


@router.get("/balance-sheet")
def balance_sheet(
    as_on: DateType | None = None,
    hide_zero: bool = True,
    db: Session = Depends(get_db),
):
    movement = _movement(db, None, as_on)
    sections = {"asset": [], "liability": [], "equity": []}
    profit = ZERO      # income - expense up to the date, shown inside equity

    for acc in db.query(Account).order_by(Account.name).all():
        dr, cr = movement.get(acc.id, (ZERO, ZERO))
        opening = _d(acc.opening_balance)
        bal = opening + dr - cr if acc.account_type in DEBIT_NORMAL else opening + cr - dr

        if acc.account_type == "income":
            profit += bal
        elif acc.account_type == "expense":
            profit -= bal
        elif not (hide_zero and bal == 0):
            sections[acc.account_type].append(
                {"account_id": acc.id, "account_name": acc.name, "amount": bal}
            )

    total_assets = sum((r["amount"] for r in sections["asset"]), ZERO)
    total_liab = sum((r["amount"] for r in sections["liability"]), ZERO)
    equity_base = sum((r["amount"] for r in sections["equity"]), ZERO)
    total_equity = equity_base + profit
    diff = total_assets - (total_liab + total_equity)

    return {
        "as_on": as_on,
        "assets": {"rows": sections["asset"], "total": total_assets},
        "liabilities": {"rows": sections["liability"], "total": total_liab},
        "equity": {"rows": sections["equity"], "profit_to_date": profit, "total": total_equity},
        "liabilities_and_equity": total_liab + total_equity,
        "difference": diff,
        "is_balanced": diff == 0,
    }