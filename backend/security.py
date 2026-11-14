"""Demo-only bearer authentication and role checks for SwasthyaSetu AI.

This is a teaching prototype. Use HTTPS, managed secrets, secure sessions,
rate limiting, audit logging and a reviewed identity provider before production.
"""
import base64
import hashlib
import hmac
import json
import os
import time
from typing import Callable

from fastapi import Depends, Header, HTTPException

SECRET = os.getenv("SWASTHYASETU_DEMO_SECRET", "CHANGE-ME-DEMO-ONLY-SECRET")
TOKEN_TTL_SECONDS = 60 * 60 * 8
ROLES = {"patient", "health_worker", "admin"}


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 180_000)
    return base64.urlsafe_b64encode(salt).decode() + "." + base64.urlsafe_b64encode(digest).decode()


def verify_password(password: str, encoded: str) -> bool:
    try:
        salt_text, digest_text = encoded.split(".", 1)
        salt = base64.urlsafe_b64decode(salt_text.encode())
        expected = base64.urlsafe_b64decode(digest_text.encode())
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 180_000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def issue_token(user: dict) -> str:
    payload = {"sub": user["id"], "email": user["email"], "name": user["name"],
               "role": user["role"], "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    body = _b64(json.dumps(payload, separators=(",", ":")).encode())
    signature = _b64(hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).digest())
    return body + "." + signature


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in to continue")
    token = authorization[7:].strip()
    try:
        body, signature = token.split(".", 1)
        expected = _b64(hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("expired")
        if payload.get("role") not in ROLES:
            raise ValueError("role")
        # Re-check account state and role on every request so disabled users or
        # changed roles cannot keep using an old token.
        from backend.database import get_connection
        connection = get_connection()
        try:
            account = connection.execute(
                "SELECT role, is_active FROM app_users WHERE id=?", (payload.get("sub"),)
            ).fetchone()
        finally:
            connection.close()
        if not account or not account["is_active"] or account["role"] != payload["role"]:
            raise ValueError("account")
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired demo session")


def require_roles(*roles: str) -> Callable:
    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Your demo role cannot perform this action")
        return user
    return checker
