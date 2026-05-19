# Performance testing (Locust)

Load tests for the TeamNest API. They run against a locally running server —
no Docker required.

## Files

- `locustfile.py` — the load test (login + read endpoints + one write path)
- `seed_users.py` — creates pre-verified accounts the test logs in with
- `requirements-perf.txt` — the only extra dependency (`locust`)

## One-time setup

From the `backend/` directory:

```sh
pip install -r perf/requirements-perf.txt
```

## Running a test

1. **Start the API** (in one terminal, from `backend/`):

   ```sh
   uvicorn main:app
   ```

   This uses your normal `.env` / `DATABASE_URL` — the test hits your real
   dev database.

2. **Seed login accounts** (once, or after a DB reset):

   ```sh
   python perf/seed_users.py 50
   ```

   Creates `perfuser0@loadtest.local` … `perfuser49@loadtest.local`, all with
   password `Perf1!Pass`, all pre-verified so the test can log in.

3. **Run Locust** (from `backend/perf/`):

   ```sh
   locust -f locustfile.py --host http://localhost:8000
   ```

   Open <http://localhost:8089>, pick the number of users and spawn rate, and
   start. The UI shows requests/sec and p50/p95/p99 latency per endpoint.

   Headless (no browser, prints a summary):

   ```sh
   locust -f locustfile.py --host http://localhost:8000 \
          --users 50 --spawn-rate 5 --run-time 2m --headless
   ```

## Cleanup

The test's `/register` task and the seed script both create accounts under
the `@loadtest.local` domain. Remove every one of them with:

```sh
python perf/seed_users.py --clean
```

## Notes / tuning

- Keep `USER_COUNT` in `locustfile.py` ≤ the number you passed to
  `seed_users.py`. If Locust spawns more simulated users, accounts are
  reused — fine for read load.
- `wait_time` is the think-time between requests. Lower it to push harder.
- Treat the in-process `uvicorn main:app` numbers as relative, not absolute:
  a single dev worker on your laptop is not production. Use the results to
  compare endpoints and spot regressions, not to predict prod capacity.
