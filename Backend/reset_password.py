"""Reset someone's password directly in the database (for when the owner is locked out).

Run it from the Backend folder, with the venv active:
    python reset_password.py
It lists every account first, so you do not need to remember the email.
"""
import getpass
import sys

from dotenv import load_dotenv

load_dotenv()

from database import MainSession          # noqa: E402
from models_users import Business, User    # noqa: E402
from security import hash_password         # noqa: E402

with MainSession() as db:
    users = db.query(User).order_by(User.id).all()
    if not users:
        sys.exit("There are no accounts in the database yet. Register one on the website.")

    names = {b.id: b.name for b in db.query(Business).all()}
    print("\nAccounts:")
    for i, u in enumerate(users, 1):
        print(f"  {i}. {u.email}   name: {u.name}   role: {u.role}   business: {names.get(u.business_id, '-')}")

    pick = input("\nType the number of the account to reset: ").strip()
    if not pick.isdigit() or not 1 <= int(pick) <= len(users):
        sys.exit("That is not a number from the list.")
    user = users[int(pick) - 1]

    pw = getpass.getpass(f"New password for {user.email} (8 to 72 characters): ")
    if getpass.getpass("Repeat new password: ") != pw:
        sys.exit("The two passwords do not match.")
    if len(pw) < 8 or len(pw.encode()) > 72:
        sys.exit("Use 8 to 72 characters.")

    user.password_hash = hash_password(pw)     # old login tokens stop working automatically
    db.commit()
    print(f"\nDone. Sign in as {user.email} with the new password.")