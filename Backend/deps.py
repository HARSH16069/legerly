from fastapi import HTTPException, Request

from database import MainSession, tenant_session


def get_main_db():
    """The main database (businesses and users). Only sign-in, register and Team use this."""
    db = MainSession()
    try:
        yield db
    finally:
        db.close()


def get_db(request: Request):
    """The accounting database of the signed-in person's own business.
    guard.py puts the business on request.state.user before any route runs."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(401, "Please sign in.")
    db = tenant_session(user["db_name"])
    try:
        yield db
    finally:
        db.close()