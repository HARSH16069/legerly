"""Register a business, sign in, who am I, change password, and the Team (staff) API.
Each business has its own accounting database; people and businesses live in the main database."""
import hmac
import os
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import ratelimit
from database import drop_database, utcnow
from deps import get_main_db
from models_users import User
from security import hash_password, make_token, verify_password
from tenancy import create_business_database

router = APIRouter(tags=["Auth"])
ROLES = ("owner", "admin", "accountant", "sales")
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
REGISTRATION_CODE = os.getenv("REGISTRATION_CODE")   # if set, new businesses must send this invite code


def public(u: User):
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "is_active": u.is_active,
            "business_id": u.business_id, "created_at": u.created_at, "last_login": u.last_login}


def check_password(password):
    if len(password or "") < 8:
        raise HTTPException(400, "Use a password of at least 8 characters.")
    if len(password.encode()) > 72:                    # bcrypt cannot use more than 72 bytes
        raise HTTPException(400, "Use a password of at most 72 bytes (about 72 characters).")


def check_new(name, email, password):
    if not (name or "").strip():
        raise HTTPException(400, "Enter a name.")
    if not EMAIL.match(email):
        raise HTTPException(400, "Enter a valid email address.")
    check_password(password)


def _ip(request: Request) -> str:
    # Behind a reverse proxy, run uvicorn with --proxy-headers so this is the real client address.
    return request.client.host if request.client else "unknown"


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    business_name: str
    invite_code: str | None = None


class LoginIn(BaseModel):
    email: str
    password: str


@router.get("/auth/setup-status")
def setup_status():
    """Every registration now creates a new business, so the person is always its first user."""
    return {"first_user": True, "invite_code_required": bool(REGISTRATION_CODE)}


@router.post("/auth/register")
def register(request: Request, body: RegisterIn, db: Session = Depends(get_main_db)):
    """Creates a new business with its own private database. The person becomes its owner."""
    key = f"reg:{_ip(request)}"
    ratelimit.check(key, 5, 3600)                      # 5 sign-up attempts per hour per address
    ratelimit.hit(key, 3600)
    if REGISTRATION_CODE and not hmac.compare_digest((body.invite_code or "").encode(), REGISTRATION_CODE.encode()):
        raise HTTPException(403, "A valid invite code is required to register.")

    email = body.email.strip().lower()
    check_new(body.name, email, body.password)
    if not body.business_name.strip():
        raise HTTPException(400, "Enter your business name.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "An account with this email already exists.")

    biz = create_business_database(db, body.business_name.strip())
    db_name = biz.db_name
    try:
        user = User(business_id=biz.id, name=body.name.strip(), email=email,
                    password_hash=hash_password(body.password), role="owner", is_active=True)
        db.add(user)
        db.commit()
    except IntegrityError:                             # someone registered the same email at the same moment
        db.rollback()
        _discard(db_name)
        raise HTTPException(400, "An account with this email already exists.")
    except Exception:
        db.rollback()
        _discard(db_name)
        raise
    db.refresh(user)
    return {"pending": False, "token": make_token(user), "user": public(user)}


def _discard(db_name: str):
    try:
        drop_database(db_name)
    except Exception:
        pass


@router.post("/auth/login")
def login(request: Request, body: LoginIn, db: Session = Depends(get_main_db)):
    email = body.email.strip().lower()
    ip = _ip(request)
    k_user, k_ip = f"login:{ip}:{email}", f"loginip:{ip}"
    ratelimit.check(k_user, 5, 900)                    # 5 wrong passwords per address+email per 15 min
    ratelimit.check(k_ip, 30, 900)

    u = db.query(User).filter(User.email == email).first()
    if not u or not verify_password(body.password, u.password_hash):
        ratelimit.hit(k_user, 900)
        ratelimit.hit(k_ip, 900)
        raise HTTPException(401, "Email or password is incorrect.")
    if not u.is_active:
        raise HTTPException(403, "Your account has been switched off. Ask your owner or admin.")
    ratelimit.clear(k_user)
    u.last_login = utcnow()
    db.commit()
    return {"token": make_token(u), "user": public(u)}


@router.get("/auth/me")
def me(request: Request):
    u = request.state.user
    return {k: u[k] for k in ("id", "name", "email", "role", "business_id", "business_name")}   # never db_name


class PasswordIn(BaseModel):
    old_password: str
    new_password: str


@router.post("/auth/change-password")
def change_password(request: Request, body: PasswordIn, db: Session = Depends(get_main_db)):
    u = db.get(User, request.state.user["id"])
    if not verify_password(body.old_password, u.password_hash):
        raise HTTPException(400, "The current password is not correct.")
    check_password(body.new_password)
    u.password_hash = hash_password(body.new_password)
    db.commit()
    # Old tokens stop working now, so hand back a fresh one for this device.
    return {"message": "Password changed.", "token": make_token(u)}


# ---------------- Team (owner and admin only; enforced in guard.py) ----------------
# Every query below is limited to the signed-in person's own business.
def _guard(actor, target_role, new_role=None):
    """Only an owner may create, change or promote owner and admin accounts."""
    if actor["role"] != "owner" and (target_role in ("owner", "admin") or new_role in ("owner", "admin")):
        raise HTTPException(403, "Only the owner can manage owner and admin accounts.")


def _member(db, actor, user_id):
    u = db.get(User, user_id)
    if not u or u.business_id != actor["business_id"]:
        raise HTTPException(404, "User not found")
    return u


@router.get("/team")
def team(request: Request, db: Session = Depends(get_main_db)):
    q = db.query(User).filter(User.business_id == request.state.user["business_id"])
    return [public(u) for u in q.order_by(User.created_at).all()]


class TeamIn(BaseModel):
    name: str
    email: str
    password: str
    role: str


@router.post("/team")
def add_member(request: Request, body: TeamIn, db: Session = Depends(get_main_db)):
    actor = request.state.user
    email = body.email.strip().lower()
    check_new(body.name, email, body.password)
    if body.role not in ROLES:
        raise HTTPException(400, "Unknown role.")
    _guard(actor, None, body.role)
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "An account with this email already exists.")
    u = User(business_id=actor["business_id"], name=body.name.strip(), email=email,
             password_hash=hash_password(body.password), role=body.role, is_active=True)
    db.add(u)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "An account with this email already exists.")
    db.refresh(u)
    return public(u)


class TeamUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None      # reset the password (that person is signed out everywhere)


@router.put("/team/{user_id}")
def update_member(request: Request, user_id: int, body: TeamUpdate, db: Session = Depends(get_main_db)):
    actor = request.state.user
    u = _member(db, actor, user_id)
    if body.role is not None and body.role not in ROLES:
        raise HTTPException(400, "Unknown role.")
    _guard(actor, u.role, body.role)
    if actor["id"] == u.id and ((body.role and body.role != u.role) or body.is_active is False):
        raise HTTPException(400, "You can’t change your own role or switch yourself off.")
    losing_owner = u.role == "owner" and ((body.role and body.role != "owner") or body.is_active is False)
    others = db.query(User).filter(User.business_id == u.business_id, User.role == "owner", User.is_active.is_(True), User.id != u.id)
    if losing_owner and others.count() == 0:
        raise HTTPException(400, "There must be at least one active owner.")
    if body.name is not None and body.name.strip():
        u.name = body.name.strip()
    if body.role is not None:
        u.role = body.role
    if body.is_active is not None:
        u.is_active = body.is_active
    if body.password:
        check_password(body.password)
        u.password_hash = hash_password(body.password)
    db.commit()
    return public(u)