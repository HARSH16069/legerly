"""Databases.

  ledgerly_main  - the main database: businesses and the people who sign in.
  biz_<id>       - one database per business, holding ALL of that business's accounting data.

Settings come from environment variables (see .env.example): DB_USER, DB_PASSWORD, DB_HOST, DB_PORT.
"""
import os
import threading
from collections import OrderedDict
from datetime import datetime, timezone

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker

USER = os.getenv("DB_USER", "ledgerly_app")
PASSWORD = os.environ["DB_PASSWORD"]            # no default: the app refuses to start without it
HOST = os.getenv("DB_HOST", "localhost")
PORT = int(os.getenv("DB_PORT", "5432"))
SSLMODE = os.getenv("DB_SSLMODE")               # set to "require" for hosted databases such as Neon
ADMIN_DB = os.getenv("DB_ADMIN_DB", "postgres")   # an existing database used to run CREATE DATABASE (Neon: neondb)
MAIN_DB = "ledgerly_main"


def utcnow() -> datetime:
    """Naive UTC time (what the existing columns already store), without the deprecated utcnow()."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def db_url(name: str) -> URL:
    # URL.create escapes special characters in the password for us.
    query = {"sslmode": SSLMODE} if SSLMODE else {}
    return URL.create("postgresql+psycopg", username=USER, password=PASSWORD, host=HOST, port=PORT, database=name, query=query)


Base = declarative_base()         # accounting tables: one copy inside every business database
MasterBase = declarative_base()   # businesses and users: only in the main database

# Old single-database engine. It never connects until used; nothing creates tables in it any more.
engine = create_engine(db_url("accounting_db"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

main_engine = create_engine(db_url(MAIN_DB), pool_pre_ping=True)
MainSession = sessionmaker(autocommit=False, autoflush=False, bind=main_engine)

# Connection pools for business databases. Only the most recently used ones are kept open, so many
# businesses cannot exhaust Postgres's max_connections. Worst case: MAX_TENANT_ENGINES * (2 + 1).
MAX_TENANT_ENGINES = int(os.getenv("MAX_TENANT_ENGINES", "20"))
_engines: "OrderedDict[str, object]" = OrderedDict()
_lock = threading.Lock()


def engine_for(db_name: str):
    with _lock:
        eng = _engines.get(db_name)
        if eng is not None:
            _engines.move_to_end(db_name)
            return eng
        eng = create_engine(db_url(db_name), pool_size=2, max_overflow=1, pool_pre_ping=True, pool_recycle=1800)
        _engines[db_name] = eng
        while len(_engines) > MAX_TENANT_ENGINES:
            _, old = _engines.popitem(last=False)
            old.dispose()          # connections currently in use stay valid; idle ones are closed
        return eng


def tenant_session(db_name: str):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine_for(db_name))()


def ensure_database(name: str):
    """Creates the database if it does not exist yet."""
    admin = create_engine(db_url(ADMIN_DB), isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as conn:
            if not conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": name}).first():
                conn.execute(text(f'CREATE DATABASE "{name}"'))
    finally:
        admin.dispose()


def drop_database(name: str):
    """Removes a business database (used to clean up a registration that failed half-way). Postgres 13+."""
    with _lock:
        eng = _engines.pop(name, None)
    if eng is not None:
        eng.dispose()
    admin = create_engine(db_url(ADMIN_DB), isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as conn:
            conn.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
    finally:
        admin.dispose()