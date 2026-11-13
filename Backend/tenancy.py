"""Creates a new business together with its own empty accounting database."""
import logging

from fastapi import HTTPException
from sqlalchemy import text

from database import Base, drop_database, engine_for, ensure_database
from models_users import Business

log = logging.getLogger("tenancy")


# Small, safe, repeatable changes for existing business databases (create_all cannot add columns).
# Every statement must be idempotent. Add new ones to the end.
MIGRATIONS = [
    "ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS user_id INTEGER",
    "CREATE INDEX IF NOT EXISTS ix_audit_trail_user_id ON audit_trail (user_id)",
]


def upgrade_tenant(db_name: str):
    eng = engine_for(db_name)
    Base.metadata.create_all(bind=eng)            # missing tables
    with eng.begin() as conn:                     # missing columns / indexes
        for sql in MIGRATIONS:
            conn.execute(text(sql))


def create_business_database(main_db, name: str) -> Business:
    """Adds the business row, creates its database and all accounting tables in it.
    The caller commits the main database afterwards."""
    biz = Business(name=name)
    main_db.add(biz)
    main_db.flush()                       # gives the business its id
    biz.db_name = f"biz_{biz.id}"
    db_name = biz.db_name
    try:
        ensure_database(db_name)
        Base.metadata.create_all(bind=engine_for(db_name))   # every accounting table, empty
    except Exception as e:
        main_db.rollback()
        try:
            drop_database(db_name)        # do not leave a half-built database behind
        except Exception:
            log.exception("Could not clean up %s", db_name)
        raise HTTPException(500, f"Could not create the business database: {e}")
    return biz


def sync_tenant_tables(main_db):
    """Brings every older business database up to date (missing tables, plus the MIGRATIONS above)."""
    names = [n for (n,) in main_db.query(Business.db_name).filter(Business.db_name.isnot(None)).all()]
    for name in names:
        try:
            upgrade_tenant(name)
        except Exception:
            log.exception("Could not update tables in %s", name)