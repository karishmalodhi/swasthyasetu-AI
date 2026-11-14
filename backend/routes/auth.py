import sqlite3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from backend.database import get_connection
from backend.security import hash_password, verify_password, issue_token, get_current_user, require_roles
from fastapi import Depends

router = APIRouter(prefix="/api/auth", tags=["Demo Authentication & Roles"])

class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=254)
    password: str = Field(min_length=8, max_length=128)

class LoginInput(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=254)
    password: str = Field(min_length=1, max_length=128)

@router.post("/register", status_code=201)
def register(payload: RegisterInput):
    connection = get_connection()
    try:
        cursor = connection.execute(
            "INSERT INTO app_users (name,email,password_hash,role) VALUES (?,?,?,'patient')",
            (payload.name.strip(), str(payload.email).lower(), hash_password(payload.password)))
        connection.commit()
        user = connection.execute("SELECT id,name,email,role FROM app_users WHERE id=?", (cursor.lastrowid,)).fetchone()
        result = dict(user)
        return {"user": result, "access_token": issue_token(result), "token_type": "bearer"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    finally:
        connection.close()

@router.post("/login")
def login(payload: LoginInput):
    connection = get_connection()
    try:
        row = connection.execute("SELECT * FROM app_users WHERE email=? AND is_active=1", (str(payload.email).lower(),)).fetchone()
        if not row or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Email or password is incorrect")
        user = {"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"]}
        return {"user": user, "access_token": issue_token(user), "token_type": "bearer"}
    finally:
        connection.close()

@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {"user": user}

@router.get("/admin/summary")
def admin_summary(user: dict = Depends(require_roles("admin"))):
    connection = get_connection()
    try:
        users = connection.execute("SELECT COUNT(*) FROM app_users").fetchone()[0]
        patients = connection.execute("SELECT COUNT(*) FROM demo_patients").fetchone()[0]
        referrals = connection.execute("SELECT COUNT(*) FROM journey_referrals").fetchone()[0]
        open_referrals = connection.execute("SELECT COUNT(*) FROM journey_referrals WHERE status != 'Follow-up complete'").fetchone()[0]
        return {"users": users, "demo_patients": patients, "referrals": referrals, "open_referrals": open_referrals}
    finally:
        connection.close()
