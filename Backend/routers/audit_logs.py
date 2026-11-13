import json
from datetime import date as DateType, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from .audit import apply_raw, delete_entry_rows, entry_kind, has_payments, is_own, log, own_filter, recreate_entry, snap
from deps import get_db
from models import JournalEntry
from .models_audit import AuditLog

router = APIRouter(prefix="/audit-logs", tags=["Audit log"])


def _latest(db, rows):
    ids = {a.entity_id for a in rows}
    if not ids:
        return {}
    q = db.query(AuditLog.entity_id, func.max(AuditLog.id)).filter(AuditLog.entity_id.in_(ids)).group_by(AuditLog.entity_id)
    return dict(q.all())


def _loads(text):
    try:
        return json.loads(text) if text else None
    except ValueError:
        return None


def _row(a: AuditLog, latest):
    before, after = _loads(a.before_json), _loads(a.after_json)
    restorable = a.action == "create" or (isinstance(before, dict) and "raw" in before)
    return {
        "id": a.id, "at": a.at, "user": a.user, "action": a.action, "entity_type": a.entity_type,
        "entity_id": a.entity_id, "summary": a.summary, "reason": a.reason,
        "before": before, "after": after,
        # only the newest action on an entry can be undone, so older changes are never overwritten
        "can_undo": latest.get(a.entity_id) == a.id and restorable,
    }


def _sales_only(request: Request, a: AuditLog):
    """A sales person may only open or undo sales entries that they made themselves."""
    if request.state.user["role"] == "sales" and (a.entity_type != "sales" or not is_own(request, a)):
        raise HTTPException(403, "You can only work with your own sales entries.")


@router.get("")
def list_logs(
    request: Request,
    entity_type: str | None = None, action: str | None = None, user: str | None = None,
    entry_id: int | None = None, q: str | None = None,
    date_from: DateType | None = None, date_to: DateType | None = None,
    limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    sales = request.state.user["role"] == "sales"
    if sales:
        entity_type = "sales"          # sales people only ever see sales entries...
    query = db.query(AuditLog)
    if sales:
        query = query.filter(own_filter(request))   # ...that they made themselves
    if entity_type: query = query.filter(AuditLog.entity_type == entity_type)
    if action: query = query.filter(AuditLog.action == action)
    if user: query = query.filter(AuditLog.user.ilike(f"%{user}%"))
    if entry_id: query = query.filter(AuditLog.entity_id == entry_id)
    if q: query = query.filter(AuditLog.summary.ilike(f"%{q}%"))
    if date_from: query = query.filter(AuditLog.at >= datetime.combine(date_from, time.min))
    if date_to: query = query.filter(AuditLog.at < datetime.combine(date_to + timedelta(days=1), time.min))
    total = query.count()
    rows = query.order_by(AuditLog.at.desc(), AuditLog.id.desc()).offset(offset).limit(limit).all()
    latest = _latest(db, rows)
    return {"total": total, "items": [_row(a, latest) for a in rows]}


@router.get("/{log_id}")
def get_log(request: Request, log_id: int, db: Session = Depends(get_db)):
    a = db.get(AuditLog, log_id)
    if not a:
        raise HTTPException(404, "Audit record not found")
    _sales_only(request, a)
    return _row(a, _latest(db, [a]))


@router.post("/{log_id}/undo")
def undo(request: Request, log_id: int, db: Session = Depends(get_db)):
    """Reverses one audit record: created -> deleted, edited -> old values restored, deleted -> brought back.
    The undo is itself logged, so it can be undone again."""
    a = db.get(AuditLog, log_id)
    if not a:
        raise HTTPException(404, "Audit record not found")
    _sales_only(request, a)
    # Lock the entry row (if it exists) so two simultaneous undos cannot both run.
    entry = db.get(JournalEntry, a.entity_id, with_for_update=True)
    newest = db.query(func.max(AuditLog.id)).filter(AuditLog.entity_id == a.entity_id).scalar()
    if newest != a.id:
        raise HTTPException(409, f"Entry #{a.entity_id} was changed again afterwards (audit record #{newest}). Undo that one first.")
    before = _loads(a.before_json)
    why = f"Undo of audit record #{a.id}"

    # Money records need care: undoing around them would leave the ledger and the payment list out of step.
    if a.action == "create":
        etype = entry.entry_type if entry else None
    else:
        etype = ((before.get("raw") if isinstance(before, dict) else None) or {}).get("fields", {}).get("entry_type")
    if etype == "payment":
        raise HTTPException(409, "Payment entries can’t be undone here. Remove the payment from the Payments screen, then record it again if needed.")
    if a.action == "create" and entry and etype in ("sales", "purchase") and has_payments(db, entry.id):
        raise HTTPException(409, "Payments are recorded against this entry. Remove them first, then undo.")

    if a.action == "create":
        if not entry:
            raise HTTPException(409, "This entry no longer exists")
        cur, kind = snap(db, entry), entry_kind(entry)
        delete_entry_rows(db, entry)
        log(db, request, "delete", kind, a.entity_id, before=cur, reason=why + " (removed the new entry)")
        msg = f"Entry #{a.entity_id} removed."
    else:
        if not isinstance(before, dict) or "raw" not in before:
            raise HTTPException(400, "This record was saved before Undo existed, so it can’t be restored automatically")
        if a.action == "update":
            if not entry:
                raise HTTPException(409, "This entry no longer exists")
            cur = snap(db, entry)
            apply_raw(db, entry, before["raw"])
            log(db, request, "update", a.entity_type, a.entity_id, before=cur, after=snap(db, entry), reason=why + " (old values restored)")
            msg = f"Entry #{a.entity_id} restored to its earlier values."
        else:
            if entry:
                raise HTTPException(409, "This entry already exists again")
            entry = recreate_entry(db, before["raw"])
            log(db, request, "create", a.entity_type, a.entity_id, after=snap(db, entry), reason=why + " (entry brought back)")
            msg = f"Entry #{a.entity_id} brought back."
    db.commit()
    return {"message": msg}