"""Trial Balance.

Save as routers/trial_balance.py and add in main.py:
    from routers import trial_balance
    app.include_router(trial_balance.router)

Endpoints
  GET /trial-balance                      -> JSON (flat or grouped by account type)
  GET /trial-balance?format=csv           -> CSV download
  GET /trial-balance/unbalanced-entries   -> journal entries where debit != credit
"""
import csv
import io
from datetime import date as DateType
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from deps import get_db
from models import Account, JournalEntry, JournalEntryLine

router = APIRouter(prefix="/trial-balance", tags=["Trial Balance"])

ZERO = Decimal("0")
DEBIT_NORMAL = ("asset", "expense")
TYPE_ORDER = ["asset", "liability", "equity", "income", "expense"]


def _d(v) -> Decimal:
    return Decimal(str(v or 0))


def _safe(v) -> str:
    """Names are typed by users (sales people can add customers). A name starting with = + - @ would run as a
    formula when the CSV is opened in Excel, so it is written as plain text."""
    s = str(v)
    return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s


def _split(net: Decimal) -> tuple[Decimal, Decimal]:
    """net (debit positive) -> (debit column, credit column)."""
    return (net, ZERO) if net >= 0 else (ZERO, -net)


def build_trial_balance(
    db: Session,
    date_from: DateType | None,
    date_to: DateType | None,
    account_type: str | None,
    party_type: str | None,
    search: str | None,
    hide_zero: bool,
) -> dict:
    # One query: movement BEFORE date_from and movement INSIDE the period, per account.
    if date_from:
        before_dr = func.coalesce(func.sum(case((JournalEntry.date < date_from, JournalEntryLine.debit), else_=0)), 0)
        before_cr = func.coalesce(func.sum(case((JournalEntry.date < date_from, JournalEntryLine.credit), else_=0)), 0)
        in_cond = JournalEntry.date >= date_from
    else:
        before_dr = before_cr = func.cast(0, JournalEntryLine.debit.type)
        in_cond = True
    period_dr = func.coalesce(func.sum(case((in_cond, JournalEntryLine.debit), else_=0)), 0)
    period_cr = func.coalesce(func.sum(case((in_cond, JournalEntryLine.credit), else_=0)), 0)

    mq = (
        db.query(JournalEntryLine.account_id, before_dr, before_cr, period_dr, period_cr)
        .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
    )
    if date_to:
        mq = mq.filter(JournalEntry.date <= date_to)
    movement = {r[0]: r[1:] for r in mq.group_by(JournalEntryLine.account_id).all()}

    aq = db.query(Account)
    if account_type:
        aq = aq.filter(Account.account_type == account_type)
    if party_type:
        aq = aq.filter(Account.party_type == party_type)
    if search:
        aq = aq.filter(Account.name.ilike(f"%{search}%"))

    rows = []
    for acc in aq.order_by(Account.name).all():
        b_dr, b_cr, p_dr, p_cr = (_d(x) for x in movement.get(acc.id, (0, 0, 0, 0)))
        sign = 1 if acc.account_type in DEBIT_NORMAL else -1

        opening_net = sign * _d(acc.opening_balance) + b_dr - b_cr   # debit positive
        closing_net = opening_net + p_dr - p_cr
        if hide_zero and opening_net == 0 and p_dr == 0 and p_cr == 0 and closing_net == 0:
            continue

        o_dr, o_cr = _split(opening_net)
        c_dr, c_cr = _split(closing_net)
        rows.append({
            "account_id": acc.id,
            "account_name": acc.name,
            "account_type": acc.account_type,
            "party_type": acc.party_type,
            "opening_debit": o_dr, "opening_credit": o_cr,
            "period_debit": p_dr, "period_credit": p_cr,
            "closing_debit": c_dr, "closing_credit": c_cr,
        })

    fields = ["opening_debit", "opening_credit", "period_debit", "period_credit", "closing_debit", "closing_credit"]

    def totals(items):
        return {f: sum((r[f] for r in items), ZERO) for f in fields}

    tot = totals(rows)
    diff = tot["closing_debit"] - tot["closing_credit"]
    return {
        "date_from": date_from,
        "date_to": date_to,
        "rows": rows,
        "totals": tot,
        "difference": diff,                 # debit - credit; should be 0
        "is_balanced": diff == 0,
        "_totals_fn": totals,
    }


@router.get("")
def trial_balance(
    date_from: DateType | None = None,        # omit for "from the beginning"
    date_to: DateType | None = None,          # omit for "till today" (as-on date)
    account_type: Literal["asset", "liability", "income", "expense", "equity"] | None = None,
    party_type: Literal["customer", "supplier", "both"] | None = None,
    search: str | None = None,
    hide_zero: bool = True,
    group_by_type: bool = False,
    format: Literal["json", "csv"] = "json",
    db: Session = Depends(get_db),
):
    data = build_trial_balance(db, date_from, date_to, account_type, party_type, search, hide_zero)
    totals_fn = data.pop("_totals_fn")

    if format == "csv":
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["Account", "Type", "Opening Dr", "Opening Cr", "Period Dr", "Period Cr", "Closing Dr", "Closing Cr"])
        for r in data["rows"]:
            w.writerow([_safe(r["account_name"]), r["account_type"], r["opening_debit"], r["opening_credit"],
                        r["period_debit"], r["period_credit"], r["closing_debit"], r["closing_credit"]])
        t = data["totals"]
        w.writerow(["TOTAL", "", t["opening_debit"], t["opening_credit"], t["period_debit"],
                    t["period_credit"], t["closing_debit"], t["closing_credit"]])
        name = f"trial_balance_{date_to or 'latest'}.csv"
        return Response(buf.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": f'attachment; filename="{name}"'})

    if group_by_type:
        groups = []
        for t in TYPE_ORDER:
            items = [r for r in data["rows"] if r["account_type"] == t]
            if items:
                groups.append({"account_type": t, "rows": items, "totals": totals_fn(items)})
        data["groups"] = groups
        del data["rows"]
    return data


@router.get("/unbalanced-entries")
def unbalanced_entries(db: Session = Depends(get_db)):
    """Journal entries whose total debit is not equal to total credit.
    If the trial balance does not tally, check these first."""
    dr = func.coalesce(func.sum(JournalEntryLine.debit), 0)
    cr = func.coalesce(func.sum(JournalEntryLine.credit), 0)
    rows = (
        db.query(JournalEntry.id, JournalEntry.date, JournalEntry.entry_type, JournalEntry.narration, dr, cr)
        .join(JournalEntryLine, JournalEntryLine.journal_entry_id == JournalEntry.id)
        .group_by(JournalEntry.id)
        .having(dr != cr)
        .order_by(JournalEntry.date, JournalEntry.id)
        .all()
    )
    return [
        {"entry_id": i, "date": d, "entry_type": t, "narration": n,
         "total_debit": _d(a), "total_credit": _d(b), "difference": _d(a) - _d(b)}
        for i, d, t, n, a, b in rows
    ]