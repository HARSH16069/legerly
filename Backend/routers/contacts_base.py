from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from deps import get_db
from models import Account, JournalEntryLine
from routers.models_contacts import Address, BankDetail, ContactPerson
from routers.schemas_contacts import PartyIn

CHILDREN = (
    ("addresses", Address),
    ("contact_persons", ContactPerson),
    ("bank_details", BankDetail),
)


def _to_dict(obj, skip=()):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns if c.name not in skip}


def get_balances(db, account_ids):
    """{account_id: balance} from the opening balance and all journal lines.
    Vendor (liability): credit - debit = amount you owe.
    Customer (asset):   debit - credit = amount they owe you."""
    if not account_ids:
        return {}
    sums = {
        aid: (d, c)
        for aid, d, c in db.query(
            JournalEntryLine.account_id,
            func.coalesce(func.sum(JournalEntryLine.debit), 0),
            func.coalesce(func.sum(JournalEntryLine.credit), 0),
        ).filter(JournalEntryLine.account_id.in_(account_ids))
         .group_by(JournalEntryLine.account_id).all()
    }
    result = {}
    for acc in db.query(Account).filter(Account.id.in_(account_ids)).all():
        d, c = sums.get(acc.id, (0, 0))
        if acc.account_type in ("asset", "expense"):
            result[acc.id] = acc.opening_balance + d - c
        else:
            result[acc.id] = acc.opening_balance + c - d
    return result


def serialize(p, balances=None):
    data = _to_dict(p)
    data["balance"] = (balances or {}).get(p.account_id, 0)
    for rel, _ in CHILDREN:
        data[rel] = [_to_dict(c, skip=("vendor_id", "customer_id")) for c in getattr(p, rel)]
    return data


def build_router(prefix, tag, Model, fk_name, account_type, party_type):
    """fk_name: 'vendor_id' or 'customer_id' (column on the child tables)."""
    router = APIRouter(prefix=prefix, tags=[tag])

    def fill_children(party, body: PartyIn):
        for rel, Child in CHILDREN:
            setattr(party, rel, [Child(**item.model_dump()) for item in getattr(body, rel)])

    def get_or_404(db, pid):
        p = db.get(Model, pid)
        if not p:
            raise HTTPException(404, f"{tag[:-1]} not found")
        return p

    @router.post("")
    def create(body: PartyIn, db: Session = Depends(get_db)):
        if db.query(Model).filter(Model.display_name == body.display_name).first() \
           or db.query(Account).filter(Account.name == body.display_name).first():
            raise HTTPException(400, f"'{body.display_name}' already exists")

        # ledger account used for journal entries
        account = Account(
            name=body.display_name,
            account_type=account_type,
            party_type=party_type,
            opening_balance=0,
            description=f"{tag[:-1]} account",
            allow_negative=True,
        )
        db.add(account)
        db.flush()

        data = body.model_dump(exclude={"addresses", "contact_persons", "bank_details"})
        party = Model(**data, account_id=account.id)
        fill_children(party, body)
        db.add(party)
        db.commit()
        db.refresh(party)
        return serialize(party, get_balances(db, [party.account_id]))

    @router.get("")
    def list_all(active_only: bool = True, db: Session = Depends(get_db)):
        q = db.query(Model)
        if active_only:
            q = q.filter(Model.is_active.is_(True))
        parties = q.order_by(Model.display_name).all()
        bal = get_balances(db, [p.account_id for p in parties])
        return [serialize(p, bal) for p in parties]

    @router.get("/{pid}")
    def get_one(pid: int, db: Session = Depends(get_db)):
        p = get_or_404(db, pid)
        return serialize(p, get_balances(db, [p.account_id]))

    @router.put("/{pid}")
    def update(pid: int, body: PartyIn, db: Session = Depends(get_db)):
        party = get_or_404(db, pid)
        if db.query(Model).filter(Model.display_name == body.display_name, Model.id != pid).first() \
           or db.query(Account).filter(Account.name == body.display_name, Account.id != party.account_id).first():
            raise HTTPException(400, f"'{body.display_name}' already exists")
        for k, v in body.model_dump(exclude={"addresses", "contact_persons", "bank_details"}).items():
            setattr(party, k, v)
        fill_children(party, body)   # replaces old child rows
        acc = db.get(Account, party.account_id)
        if acc:
            acc.name = body.display_name
        db.commit()
        db.refresh(party)
        return serialize(party, get_balances(db, [party.account_id]))

    @router.delete("/{pid}")
    def deactivate(pid: int, db: Session = Depends(get_db)):
        party = get_or_404(db, pid)
        party.is_active = False      # keep history; journal entries still reference it
        db.commit()
        return {"message": "Deactivated"}

    @router.patch("/{pid}/activate")      # PATCH, so sales people (who may only GET and POST here) cannot use it
    def activate(pid: int, db: Session = Depends(get_db)):
        party = get_or_404(db, pid)
        party.is_active = True
        db.commit()
        return {"message": "Activated"}

    return router