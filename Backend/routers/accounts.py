from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from deps import get_db
from helpers import calculate_balance, default_allow_negative
from models import Account, JournalEntryLine
from schemas import AccountCreate, AccountType, PartyType

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.post("")
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    if db.query(Account).filter(Account.name == account.name).first():
        raise HTTPException(
            status_code=400,
            detail=f"Account with name '{account.name}' already exists",
        )

    party = account.party_type.value if account.party_type else None

    # Use the user's value if given, otherwise decide automatically
    if account.allow_negative is None:
        allow_negative = default_allow_negative(account.account_type.value, party)
    else:
        allow_negative = account.allow_negative

    new_account = Account(
        name=account.name,
        account_type=account.account_type.value,
        party_type=party,
        opening_balance=account.opening_balance,
        description=account.description,
        allow_negative=allow_negative,
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account


class AccountUpdate(BaseModel):
    name: str | None = None
    account_type: AccountType | None = None
    opening_balance: Decimal | None = Field(None, decimal_places=2)
    description: str | None = None
    allow_negative: bool | None = None


# The sales and purchase forms find these by name, so their name and type must stay as they are.
SYSTEM_ACCOUNTS = {"Cash", "Sales", "Purchases", "GST Payable", "GST Input"}


@router.put("/{account_id}")
def update_account(account_id: int, body: AccountUpdate, db: Session = Depends(get_db)):
    acc = db.get(Account, account_id)
    if not acc:
        raise HTTPException(404, "Account not found")

    data = body.model_dump(exclude_unset=True)
    # Customer and vendor accounts are renamed from the Customers and vendors page; system accounts are fixed.
    locked = acc.name in SYSTEM_ACCOUNTS or acc.party_type is not None

    if "name" in data and data["name"] is not None:
        name = data["name"].strip()
        if not name:
            raise HTTPException(400, "Enter an account name.")
        if name != acc.name:
            if locked:
                raise HTTPException(400, "This account's name can't be changed here. People accounts are renamed on the Customers and vendors page, and system accounts keep their name.")
            if db.query(Account).filter(Account.name == name, Account.id != acc.id).first():
                raise HTTPException(400, f"Account with name '{name}' already exists")
            acc.name = name

    new_type = data["account_type"].value if data.get("account_type") else None
    type_changed = new_type is not None and new_type != acc.account_type
    if type_changed:
        if locked:
            raise HTTPException(400, "The type of this account can't be changed.")
        acc.account_type = new_type

    if data.get("opening_balance") is not None:
        acc.opening_balance = data["opening_balance"]
    if "description" in data:
        acc.description = (data["description"] or "").strip() or None
    if data.get("allow_negative") is not None:
        acc.allow_negative = data["allow_negative"]
    elif type_changed:
        acc.allow_negative = default_allow_negative(acc.account_type, acc.party_type)

    db.flush()
    if not acc.allow_negative and calculate_balance(db, acc) < 0:
        db.rollback()
        raise HTTPException(400, "With these changes the balance would go below zero. Turn on 'allow the balance to go below zero', or check the type and opening balance.")
    db.commit()
    db.refresh(acc)
    return acc


@router.get("")
def get_accounts(
    account_type: AccountType | None = None,
    party_type: PartyType | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Account)

    if account_type:
        query = query.filter(Account.account_type == account_type.value)

    if party_type in (PartyType.customer, PartyType.supplier):
        query = query.filter(
            Account.party_type.in_([party_type.value, PartyType.both.value])
        )
    elif party_type:
        query = query.filter(Account.party_type == party_type.value)

    return query.all()
@router.get("/{account_id}/balance")
def get_account_balance(account_id: int, db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(404, "Account not found")

    total_debit, total_credit = db.query(
        func.coalesce(func.sum(JournalEntryLine.debit), 0),
        func.coalesce(func.sum(JournalEntryLine.credit), 0),
    ).filter(JournalEntryLine.account_id == account_id).one()

    # Assets and expenses grow with debit; the rest grow with credit
    if account.account_type in ("asset", "expense"):
        balance = account.opening_balance + total_debit - total_credit
    else:
        balance = account.opening_balance + total_credit - total_debit

    return {
        "account": account.name,
        "account_type": account.account_type,
        "opening_balance": account.opening_balance,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "balance": balance,
    }