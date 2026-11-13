"""One place that decides who may call what.

Every request (except sign-in and register) must carry a valid login token. The person's role is then
checked against RULES below. Anything not listed is for owner, admin and accountant only, so a sales
person can never reach it, even by typing the address by hand.

The person's business is also looked up here, so every later route reads and writes only that
business's own database (see deps.get_db).
"""
import hmac
import json

from fastapi import Request
from fastapi.responses import JSONResponse, Response
from starlette.concurrency import run_in_threadpool

from deps import get_main_db
from models_users import Business, User
from security import password_fingerprint, read_token

BOOKS = {"owner", "admin", "accountant"}
ALL = BOOKS | {"sales"}
ADMINS = {"owner", "admin"}

PUBLIC = {"/", "/docs", "/redoc", "/openapi.json", "/auth/login", "/auth/register", "/auth/setup-status", "/health"}

# (path prefix, methods or None for all methods, roles allowed). The longest matching prefix wins.
RULES = [
    ("/auth", None, ALL),                              # me, change-password
    ("/team", None, ADMINS),                           # manage staff
    ("/sales-entries", None, BOOKS),                   # editing a sale
    ("/sales-entries", {"GET", "POST"}, ALL),          # sales people can list and create sales
    ("/customers", None, BOOKS),
    ("/customers", {"GET", "POST"}, ALL),              # sales people can list and add customers
    ("/entries", {"DELETE"}, ADMINS),                  # deleting any entry
    ("/audit-logs", {"GET"}, ALL),                     # everyone who can open the page
    ("/audit-logs", {"POST"}, ADMINS | {"sales"}),     # undo (sales: own sales entries only, checked in audit_logs.py)
]

# Fields a sales person never sees in customer and account data.
HIDE_FOR_SALES = {"bank_details", "balance", "opening_balance", "remarks", "custom_fields", "reporting_tags"}


def allowed(role: str, method: str, path: str, query) -> bool:
    if role == "sales" and method == "GET":
        if path == "/accounts" and query.get("party_type") == "customer":          # customer picker on the sales form
            return True
        if path == "/reminders/terms" and query.get("entry_type") == "sales":       # payment status in the sales list
            return True
    hits = [r for r in RULES if (path == r[0] or path.startswith(r[0] + "/")) and (r[1] is None or method in r[1])]
    if not hits:
        return role in BOOKS
    best = max(hits, key=lambda r: (len(r[0]), r[1] is not None))
    return role in best[2]


def _strip(x):
    if isinstance(x, list):
        return [_strip(i) for i in x]
    if isinstance(x, dict):
        return {k: _strip(v) for k, v in x.items() if k not in HIDE_FOR_SALES}
    return x


def _under(path: str, prefix: str) -> bool:
    return path == prefix or path.startswith(prefix + "/")


def _hide_for_sales(role: str, method: str, path: str, status: int) -> bool:
    """True when this response must have the private fields removed."""
    if role != "sales" or status != 200:
        return False
    if _under(path, "/customers") and method in ("GET", "POST"):
        return True
    return _under(path, "/accounts") and method == "GET"


def _load_user(payload: dict):
    """Who is this, and which business do they belong to? (main database; runs in a worker thread)"""
    try:
        uid = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        return None
    gen = get_main_db()
    db = next(gen)
    try:
        u = db.get(User, uid)
        if not u or not u.is_active:
            return None
        # A token from before a password change or reset is no longer valid.
        if not hmac.compare_digest(str(payload.get("pv", "")), password_fingerprint(u.password_hash)):
            return None
        biz = db.get(Business, u.business_id)
        if not biz or not biz.db_name:
            return None
        return {"id": u.id, "name": u.name, "email": u.email, "role": u.role,
                "business_id": biz.id, "business_name": biz.name, "db_name": biz.db_name}
    finally:
        gen.close()


def _kept_headers(resp) -> dict:
    """Original response headers (cookies, cache, custom ones) minus the length, which changes."""
    return {k: v for k, v in resp.headers.items() if k.lower() != "content-length"}


async def auth_middleware(request: Request, call_next):
    path, method = request.url.path, request.method
    if method == "OPTIONS" or path in PUBLIC:
        return await call_next(request)

    auth = request.headers.get("authorization") or ""
    token = auth[7:] if auth.lower().startswith("bearer ") else ""
    payload = read_token(token) if token else None
    if not payload:
        return JSONResponse({"detail": "Please sign in."}, status_code=401)

    user = await run_in_threadpool(_load_user, payload)      # keeps the event loop free
    if not user:
        return JSONResponse({"detail": "Your session has ended. Please sign in again."}, status_code=401)

    if not allowed(user["role"], method, path, request.query_params):
        return JSONResponse({"detail": f"Your role ({user['role']}) is not allowed to do this."}, status_code=403)

    request.state.user = user
    resp = await call_next(request)

    if _hide_for_sales(user["role"], method, path, resp.status_code):
        body = b"".join([chunk async for chunk in resp.body_iterator])
        headers = _kept_headers(resp)
        try:
            return JSONResponse(_strip(json.loads(body)), status_code=resp.status_code, headers=headers)
        except ValueError:
            return Response(content=body, status_code=resp.status_code, headers=headers, media_type=resp.media_type)
    return resp