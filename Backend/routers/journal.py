from datetime import date as DateType
from decimal import Decimal

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from .audit import log, snap
from deps import get_db
from files import save_attachments
from helpers import check_negative_balances
from models import Account, JournalEntry, JournalEntryLine
from schemas import JournalEntryCreate
from serializers import entry_to_dict

router = APIRouter(prefix="/journal-entries", tags=["Journal"])


@router.post("")
def create_journal_entry(request: Request, entry: JournalEntryCreate, db: Session = Depends(get_db)):
    if len(entry.lines) < 2:
        raise HTTPException(400, "Journal entry must have at least two lines")

    total_debit = Decimal("0")
    total_credit = Decimal("0")

    for line in entry.lines:
        if line.debit < 0 or line.credit < 0:
            raise HTTPException(400, "Debit and credit cannot be negative")
        if line.debit > 0 and line.credit > 0:
            raise HTTPException(400, "A line cannot have both debit and credit")
        if line.debit == 0 and line.credit == 0:
            raise HTTPException(400, "Each line must have a debit or credit amount")
        if not db.get(Account, line.account_id):
            raise HTTPException(404, f"Account {line.account_id} does not exist")

        total_debit += line.debit
        total_credit += line.credit

    if total_debit != total_credit:
        raise HTTPException(
            400, f"Debit ({total_debit}) must equal Credit ({total_credit})"
        )

    new_entry = JournalEntry(
        date=entry.date,
        narration=entry.narration,
        entry_type="general",
    )
    db.add(new_entry)
    db.flush()

    for line in entry.lines:
        db.add(JournalEntryLine(
            journal_entry_id=new_entry.id,
            account_id=line.account_id,
            debit=line.debit,
            credit=line.credit,
        ))
    db.flush()   # lines go to DB so the balance query counts them

    check_negative_balances(db, {l.account_id for l in entry.lines})
    log(db, request, "create", "journal", new_entry.id, after=snap(db, new_entry))   # audit trail, like manual-journal

    db.commit()
    db.refresh(new_entry)

    return {
        "message": "Journal entry created successfully",
        "journal_entry_id": new_entry.id,
        "total_debit": total_debit,
        "total_credit": total_credit,
    }


@router.get("")
def list_journal_entries(
    entry_type: str | None = None,    # general / sales / purchase
    party_id: int | None = None,
    date_from: DateType | None = None,
    date_to: DateType | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(JournalEntry)
    if entry_type:
        q = q.filter(JournalEntry.entry_type == entry_type)
    if party_id:
        q = q.filter(JournalEntry.party_id == party_id)
    if date_from:
        q = q.filter(JournalEntry.date >= date_from)
    if date_to:
        q = q.filter(JournalEntry.date <= date_to)

    entries = q.order_by(JournalEntry.date.desc(), JournalEntry.id.desc()).all()
    return [entry_to_dict(e) for e in entries]


@router.get("/{entry_id}")
def get_journal_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.get(JournalEntry, entry_id)
    if not entry:
        raise HTTPException(404, "Journal entry not found")
    return entry_to_dict(entry, with_lines=True)


@router.post("/{entry_id}/attachments")
def add_attachments(
    entry_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    if not db.get(JournalEntry, entry_id):
        raise HTTPException(404, "Journal entry not found")
    save_attachments(db, entry_id, files)
    db.commit()
    return {"message": "Attached successfully"}