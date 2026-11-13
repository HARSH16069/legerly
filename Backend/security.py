"""Password hashing and login tokens.   pip install bcrypt pyjwt"""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

SECRET = os.environ["AUTH_SECRET"]      # no default: the app refuses to start without it
if len(SECRET) < 32:
    raise RuntimeError("AUTH_SECRET must be at least 32 characters. Generate one: python -c \"import secrets; print(secrets.token_urlsafe(48))\"")
ALGO = "HS256"
TOKEN_DAYS = 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def password_fingerprint(password_hash: str) -> str:
    """Changes whenever the password changes, so old tokens stop working after a password change or reset.
    It is a keyed hash, so it reveals nothing about the stored hash."""
    return hmac.new(SECRET.encode(), password_hash.encode(), hashlib.sha256).hexdigest()[:16]


def make_token(user) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS)
    return jwt.encode(
        {"sub": str(user.id), "role": user.role, "pv": password_fingerprint(user.password_hash), "exp": exp},
        SECRET, algorithm=ALGO,
    )


def read_token(token: str):
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGO])
    except jwt.PyJWTError:
        return None