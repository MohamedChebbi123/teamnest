"""Seed users so the Locust load test can log in.

Run from the ``backend/`` directory:

    python perf/seed_users.py            # creates 50 users (default)
    python perf/seed_users.py 200        # creates 200 users

Accounts created:  perfuser0@loadtest.local .. perfuserN@loadtest.local
Password (all):    Perf1!Pass

Re-running is idempotent (existing accounts are just re-verified).
Remove every load-test account afterwards with:

    python perf/seed_users.py --clean
"""
import secrets
import sys
from pathlib import Path

# Allow running as `python perf/seed_users.py` from the backend/ directory.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from database.connection import SessionLocal

# Load every module under models/ so SQLAlchemy can resolve the string-named
# relationships declared on Users / Messages / etc. (e.g. relationship("Organization")).
# Without this, querying Users triggers mapper configuration and fails on the
# first unresolved relationship target.
import importlib
import pkgutil

import models as _models_pkg

for _modinfo in pkgutil.iter_modules(_models_pkg.__path__):
    importlib.import_module(f"{_models_pkg.__name__}.{_modinfo.name}")

from models.Users import Users  # noqa: E402  (after dynamic model loading)
from utils.hasher import hash_password  # noqa: E402

EMAIL_DOMAIN = "loadtest.com"
PASSWORD = "Perf1!Pass"
DEFAULT_COUNT = 50


def email_for(index: int) -> str:
    return f"perfuser{index}@{EMAIL_DOMAIN}"


def clean() -> None:
    """Delete every account whose email belongs to the load-test domain."""
    db = SessionLocal()
    try:
        deleted = (
            db.query(Users)
            .filter(Users.email.like(f"%@{EMAIL_DOMAIN}"))
            .delete(synchronize_session=False)
        )
        db.commit()
        print(f"Removed {deleted} load-test account(s).")
    finally:
        db.close()


def seed(count: int) -> None:
    db = SessionLocal()
    created = 0
    try:
        hashed = hash_password(PASSWORD)  # same hash for every user — fine for load testing
        for i in range(count):
            email = email_for(i)
            user = db.query(Users).filter(Users.email == email).first()
            if user:
                user.profile_completed = True
                continue
            db.add(
                Users(
                    first_name="Perf",
                    last_name=f"User{i}"[:20],
                    email=email,
                    password_hashed=hashed,
                    user_tag=str(secrets.randbelow(9_000_000) + 1_000_000),
                    profile_completed=True,
                    status="offline",
                )
            )
            created += 1
        db.commit()
        print(
            f"Seeded {count} account(s) ({created} new, {count - created} already existed).\n"
            f"  Login range: {email_for(0)} .. {email_for(count - 1)}\n"
            f"  Password:    {PASSWORD}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--clean" in args:
        clean()
    else:
        count = int(next((a for a in args if a.isdigit()), DEFAULT_COUNT))
        seed(count)
