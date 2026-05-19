"""Locust load test for the TeamNest API.

Setup (do this once, see perf/README.md for detail):
    1. Start the API:        uvicorn main:app          (from backend/)
    2. Seed login accounts:  python perf/seed_users.py 50

Run the load test (from backend/perf/):
    locust -f locustfile.py --host http://localhost:8000
        -> open http://localhost:8089 and choose users / spawn rate

Or fully headless:
    locust -f locustfile.py --host http://localhost:8000 \
           --users 50 --spawn-rate 5 --run-time 2m --headless

USER_COUNT below must not exceed how many accounts you seeded. If Locust
spawns more simulated users than that, accounts are reused (fine for a
read-heavy load test).
"""
import itertools
import random

from locust import HttpUser, between, task

USER_COUNT = 50               # keep <= the number passed to seed_users.py
PASSWORD = "Perf1!Pass"       # must match seed_users.py
EMAIL_DOMAIN = "loadtest.com"

# Hands each simulated user a seeded account index, round-robin.
_account_cycle = itertools.cycle(range(USER_COUNT))


class TeamNestUser(HttpUser):
    """One simulated user: logs in once, then loops over typical API calls."""

    wait_time = between(1, 3)  # think-time between requests
    token: str | None = None

    def on_start(self) -> None:
        """Authenticate once when this simulated user starts."""
        index = next(_account_cycle)
        with self.client.post(
            "/login",
            json={"email": f"perfuser{index}@{EMAIL_DOMAIN}", "password": PASSWORD},
            name="/login",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200 and resp.json().get("access_token"):
                self.token = resp.json()["access_token"]
            else:
                resp.failure(f"login failed: {resp.status_code} {resp.text[:150]}")

    @property
    def _auth(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    # --- read paths (weights reflect a roughly realistic traffic mix) -------

    @task(4)
    def view_profile(self):
        self.client.get("/profile", headers=self._auth, name="/profile")

    @task(3)
    def list_my_organizations(self):
        self.client.get(
            "/get_org_for_admin_org", headers=self._auth, name="/get_org_for_admin_org"
        )

    @task(2)
    def list_friends(self):
        self.client.get("/friends", headers=self._auth, name="/friends")

    @task(2)
    def list_friend_requests(self):
        self.client.get(
            "/friends/requests", headers=self._auth, name="/friends/requests"
        )

    @task(1)
    def list_blocked_users(self):
        self.client.get("/friends/blocked", headers=self._auth, name="/friends/blocked")

    # --- write path --------------------------------------------------------

    @task(1)
    def register_account(self):
        """Exercises a DB write. New rows use the loadtest.local domain so
        `python perf/seed_users.py --clean` removes them afterwards."""
        suffix = random.randint(0, 1_000_000_000)
        self.client.post(
            "/register",
            data={
                "first_name": "Load",
                "last_name": "Test",
                "email": f"reg{suffix}@{EMAIL_DOMAIN}",
                "password": PASSWORD,
            },
            name="/register",
        )
