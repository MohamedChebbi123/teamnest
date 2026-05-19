"""
UNIT TEST — Level 1

Scope: a single pure function in isolation, no DB, no HTTP, no I/O.
Target: utils.validators.validate_password
"""

import pytest
from fastapi import HTTPException

from utils.validators import validate_password


def test_validate_password_accepts_strong_password():
    assert validate_password("Strong1Pass") == "Strong1Pass"


@pytest.mark.parametrize(
    "bad_password, expected_fragment",
    [
        ("Short1A", "at least 8 characters"),
        ("alllowercase1", "uppercase letter"),
        ("ALLUPPERCASE1", "lowercase letter"),
        ("NoDigitsHere", "number"),
    ],
)
def test_validate_password_rejects_weak_passwords(bad_password, expected_fragment):
    with pytest.raises(HTTPException) as exc:
        validate_password(bad_password)
    assert exc.value.status_code == 400
    assert expected_fragment in exc.value.detail
