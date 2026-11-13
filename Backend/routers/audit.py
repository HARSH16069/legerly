import datetime as dt
import json
from decimal import Decimal

from fastapi import Request

from models import Attachment, JournalEntry, JournalEntryLine
from sqlalchemy import and_, or_

from .models_audit import AuditLog
from .models_terms import EntryTerms, Payment
from serializers import entry_to_dict

LABEL = {"sales": "Sales", "purchase": "Purchase", "journal": "Journal"}

def current_user(request: Request) -> str:
    """The signed-in person (set by guard.py). The X-User header is only a fallback."""
    u = getattr(request.state, "user", None)
    if u:
        return f"{u['name']} ({u['role']})"[:100]
    return (request.headers.get("x-user") or "unknown").strip()[:100] or "unknown"


def current_user_id(request: Request):
    u = getattr(request.state, "user", None)
    return u["id"] if u else None


def is_own(request: Request, a) -> bool:
    """Did the signed-in person make this audit record? Matches on user id; older records
    (saved before ids were stored) fall back to the name."""
    if a.user_id is not None:
        return a.user_id == current_user_id(request)
    return a.user == current_user(request)


def own_filter(request: Request):
    """SQL version of is_own, for list queries."""
    return or_(AuditLog.user_id == current_user_id(request),
               and_(AuditLog.user_id.is_(None), AuditLog.user == current_user(request)))


def has_payments(db, entry_id: int) -> bool:
    """True if money has been received / paid against this sales or purchase entry."""
    t = db.query(EntryTerms).filter(EntryTerms.entry_id == entry_id).first()
    if not t:
        return False
    live = db.query(Payment.id).filter(Payment.terms_id == t.id,
                                       Payment.journal_entry_id.in_(db.query(JournalEntry.id))).first()
    return live is not None


def entry_kind(entry) -> str:
    return entry.entry_type if entry.entry_type in ("sales", "purchase") else "journal"


def entry_id_of(result):
    if isinstance(result, dict):
        return result.get("id") or result.get("journal_entry_id")
    return getattr(result, "id", None)


def fk_key(model, target):
    """Name of the column on `model` that points at `target` (found automatically)."""
    for col in model.__table__.columns:
        for fk in col.foreign_keys:
            if fk.column.table.name == target.__table__.name:
                return col.key
    raise RuntimeError(f"{model.__name__} has no foreign key to {target.__name__}")


def _cols(model, obj):
    return {c.key: getattr(obj, c.key) for c in model.__table__.columns}


def raw_state(db, entry):
    """Everything needed to rebuild the entry exactly: its columns, lines, cash/credit terms and bill records."""
    lk, ak = fk_key(JournalEntryLine, JournalEntry), fk_key(Attachment, JournalEntry)
    lines = db.query(JournalEntryLine).filter(getattr(JournalEntryLine, lk) == entry.id).all()
    atts = db.query(Attachment).filter(getattr(Attachment, ak) == entry.id).all()
    t = db.query(EntryTerms).filter(EntryTerms.entry_id == entry.id).first()
    return {
        "fields": _cols(JournalEntry, entry),
        "lines": [{"account_id": l.account_id, "debit": l.debit, "credit": l.credit} for l in lines],
        "terms": _cols(EntryTerms, t) if t else None,
        "attachments": [_cols(Attachment, a) for a in atts],
    }


def coerce_row(model, data):
    """Turns JSON text back into dates, decimals and so on, using the column types."""
    out = {}
    for c in model.__table__.columns:
        if c.key not in data:
            continue
        v = data[c.key]
        if v is not None:
            try:
                pt = c.type.python_type
            except NotImplementedError:
                pt = None
            if pt is dt.datetime:
                v = dt.datetime.fromisoformat(v)
            elif pt is dt.date:
                v = dt.date.fromisoformat(str(v)[:10])
            elif pt is Decimal:
                v = Decimal(str(v))
        out[c.key] = v
    return out


def _restore_children(db, entry, raw):
    replace_lines(db, entry, [(l["account_id"], Decimal(str(l["debit"])), Decimal(str(l["credit"]))) for l in raw["lines"]])
    db.query(EntryTerms).filter(EntryTerms.entry_id == entry.id).delete(synchronize_session=False)
    if raw.get("terms"):
        t = coerce_row(EntryTerms, raw["terms"])
        t.pop("id", None)
        t["entry_id"] = entry.id
        db.add(EntryTerms(**t))


def apply_raw(db, entry, raw):
    """Puts an existing entry back to the saved state."""
    f = coerce_row(JournalEntry, raw["fields"])
    f.pop("id", None)
    for k, v in f.items():
        setattr(entry, k, v)
    _restore_children(db, entry, raw)
    db.flush()
    db.expire(entry)


def recreate_entry(db, raw):
    """Brings a deleted entry back with its original number, lines, terms and bill records."""
    entry = JournalEntry(**coerce_row(JournalEntry, raw["fields"]))
    db.add(entry)
    db.flush()
    _restore_children(db, entry, raw)
    for a in raw.get("attachments") or []:
        d = coerce_row(Attachment, a)
        d.pop("id", None)
        db.add(Attachment(**d))
    db.flush()
    return entry


def snap(db, entry) -> dict:
    """JSON-safe picture of an entry (with its lines and cash/credit terms)."""
    d = dict(entry_to_dict(entry))
    t = db.query(EntryTerms).filter(EntryTerms.entry_id == entry.id).first()
    if t:
        d["terms"] = {"payment_mode": t.payment_mode, "due_date": t.due_date, "is_paid": t.is_paid}
    d["raw"] = raw_state(db, entry)   # exact copy used by Undo
    return json.loads(json.dumps(d, default=str))


def log(db, request, action, kind, entry_id, before=None, after=None, reason=None):
    """Adds an audit row. The caller commits, so the log and the change succeed or fail together."""
    d = after or before or {}
    summary = f"{LABEL[kind]} entry #{entry_id}"
    if d.get("party_name"):
        summary += f", {d['party_name']}"
    if d.get("invoice_no"):
        summary += f", ref {d['invoice_no']}"
    if d.get("total_amount") is not None:
        summary += f", total {d['total_amount']}"
    db.add(AuditLog(
        user=current_user(request), user_id=current_user_id(request), action=action, entity_type=kind, entity_id=entry_id,
        summary=summary[:300], reason=(reason or "").strip()[:300] or None,
        before_json=json.dumps(before, default=str) if before is not None else None,
        after_json=json.dumps(after, default=str) if after is not None else None,
    ))


def log_create(db, request, kind, result):
    eid = entry_id_of(result)
    entry = db.get(JournalEntry, eid) if eid else None
    if entry:
        log(db, request, "create", kind, eid, after=snap(db, entry))
    db.commit()   # the single commit for the whole sale / purchase: entry, bills, terms and audit record together


def replace_lines(db, entry, lines):
    """lines: list of (account_id, debit, credit). Removes the old lines and adds these."""
    lk = fk_key(JournalEntryLine, JournalEntry)
    db.query(JournalEntryLine).filter(getattr(JournalEntryLine, lk) == entry.id).delete(synchronize_session=False)
    for account_id, debit, credit in lines:
        db.add(JournalEntryLine(**{lk: entry.id, "account_id": account_id, "debit": debit, "credit": credit}))
    db.flush()
    db.expire(entry)


def delete_entry_rows(db, entry):
    """Deletes the entry, its lines, bills and cash/credit record. Returns stored file names to remove."""
    lk, ak = fk_key(JournalEntryLine, JournalEntry), fk_key(Attachment, JournalEntry)
    files = []
    for a in db.query(Attachment).filter(getattr(Attachment, ak) == entry.id).all():
        files.append(a.stored_name)
        db.delete(a)
    db.flush()
    db.query(JournalEntryLine).filter(getattr(JournalEntryLine, lk) == entry.id).delete(synchronize_session=False)
    db.query(EntryTerms).filter(EntryTerms.entry_id == entry.id).delete(synchronize_session=False)
    db.flush()
    db.expire(entry)
    db.delete(entry)
    return files