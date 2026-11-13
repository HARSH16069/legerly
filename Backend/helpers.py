from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Account, JournalEntryLine

TWO = Decimal("0.01")


def calculate_balance(db: Session, account: Account) -> Decimal:
    total_debit, total_credit = db.query(
        func.coalesce(func.sum(JournalEntryLine.debit), 0),
        func.coalesce(func.sum(JournalEntryLine.credit), 0),
    ).filter(JournalEntryLine.account_id == account.id).one()

    if account.account_type in ("asset", "expense"):
        return account.opening_balance + total_debit - total_credit
    return account.opening_balance + total_credit - total_debit


def default_allow_negative(account_type: str, party_type: str | None) -> bool:
    # People accounts can go to the opposite side
    if party_type in ("customer", "supplier", "both"):
        return True
    # Capital / drawings
    if account_type == "equity":
        return True
    # Cash, bank, stock, income, expense, loans
    return False


def get_system_account(db: Session, name: str, account_type: str) -> Account:
    """Find an account like Sales / Purchases / GST Payable, or create it."""
    acc = db.query(Account).filter(Account.name == name).first()
    if not acc:
        acc = Account(
            name=name,
            account_type=account_type,
            party_type=None,
            opening_balance=Decimal("0"),
            allow_negative=default_allow_negative(account_type, None),
        )
        db.add(acc)
        db.flush()
    return acc


def check_negative_balances(db: Session, account_ids: set[int]):
    """Raises 400 if any non-negative account would go below zero.
    The caller must have flushed the new lines first."""
    for account_id in account_ids:
        account = db.get(Account, account_id)
        if account.allow_negative:
            continue
        if calculate_balance(db, account) < 0:
            raise HTTPException(
                status_code=400,
                detail=f"'{account.name}' balance cannot go negative",
            )


def calc_gst(taxable: Decimal, gst_rate: Decimal) -> tuple[Decimal, Decimal]:
    """Returns (gst_amount, total)."""
    if taxable <= 0:
        raise HTTPException(400, "Amount must be greater than zero")
    if taxable != taxable.quantize(TWO):
        raise HTTPException(400, "Amount can have at most 2 decimal places")
    if gst_rate < 0 or gst_rate > 100:
        raise HTTPException(400, "GST rate must be between 0 and 100")
    gst = (taxable * gst_rate / 100).quantize(TWO)
    return gst, taxable + gst


def get_party(db: Session, party_id: int, expected: str) -> Account:
    """expected = 'customer' or 'supplier'. Accounts marked 'both' are accepted for either."""
    party = db.get(Account, party_id)
    if not party:
        raise HTTPException(400, f"Selected account must be a {expected}")

    # Works for both a plain string column and an Enum column
    party_type = getattr(party.party_type, "value", party.party_type)

    if party_type not in (expected, "both"):
        raise HTTPException(400, f"Selected account must be a {expected}")
    return party