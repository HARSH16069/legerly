import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, MAIN_DB, MainSession, MasterBase, ensure_database, main_engine
import models  # noqa: F401
import models_users  # noqa: F401   # users and businesses (main database)

from routers import accounts, journal, sales, purchase, attachments, items
from routers.models_contacts import *  # noqa: F401
from routers import vendors, customers
from routers import reminders
import routers.models_audit  # noqa: F401
from routers import entries, audit_logs, payments, ledger, trial_balance, reports  # noqa: F401
from routers import auth
from guard import auth_middleware
from tenancy import sync_tenant_tables

# Every accounting table must be registered BEFORE a business database is created, or new businesses
# would silently miss it. Fail loudly at startup instead. If this fires, import the module that defines it.
_missing = {"entry_terms", "entry_payments", "audit_trail"} - set(Base.metadata.tables)
if _missing:
    raise RuntimeError(f"Tables not registered with Base: {sorted(_missing)}. Import their model modules in main.py.")

# Main database: businesses and the people who sign in. Created on first start.
ensure_database(MAIN_DB)
MasterBase.metadata.create_all(bind=main_engine)

# Older business databases get any table they are missing (new columns still need a migration).
with MainSession() as _s:
    sync_tenant_tables(_s)

# In production set APP_ENV=production to hide the interactive API docs.
PROD = os.getenv("APP_ENV") == "production"
app = FastAPI(
    title="Accounting",
    docs_url=None if PROD else "/docs",
    redoc_url=None if PROD else "/redoc",
    openapi_url=None if PROD else "/openapi.json",
)

@app.get("/health")
def health():
    """Used by the host (and an uptime monitor) to check the app is awake. Does not touch the database."""
    return {"status": "ok"}


app.middleware("http")(auth_middleware)   # added before CORS so CORS stays outermost

# ALLOWED_ORIGINS="https://app.example.com,https://www.example.com"  (defaults to any origin for local work)
_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(reminders.router)
app.include_router(vendors.router)
app.include_router(customers.router)
app.include_router(accounts.router)
app.include_router(journal.router)
app.include_router(sales.router)
app.include_router(purchase.router)
app.include_router(attachments.router)
app.include_router(items.router)
app.include_router(entries.router)
app.include_router(audit_logs.router)
app.include_router(payments.router)
app.include_router(ledger.router)
app.include_router(trial_balance.router)
app.include_router(reports.router)