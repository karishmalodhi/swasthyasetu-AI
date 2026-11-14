from datetime import date
from typing import Optional
from uuid import uuid4
import sqlite3

from fastapi import APIRouter, HTTPException, Depends
from backend.security import get_current_user, require_roles
from pydantic import BaseModel, Field

from backend.database import get_connection

router = APIRouter(prefix="/api/journeys", tags=["Unified Patient Journey"])

STAGES = ["Registration", "HealthGuard", "MaternalCare", "MediReach", "Referral", "Follow-up"]
REFERRAL_STATUSES = ["New", "Referred", "Appointment scheduled", "Follow-up complete"]


class PatientCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    age: Optional[int] = Field(default=None, ge=0, le=120)
    phone: Optional[str] = Field(default=None, pattern=r"^[0-9]{10}$")
    sex: Optional[str] = Field(default=None, max_length=20)
    notes: Optional[str] = Field(default=None, max_length=300)


class EventCreate(BaseModel):
    stage: str = Field(min_length=2, max_length=40)
    status: str = Field(default="Completed", max_length=30)
    note: Optional[str] = Field(default=None, max_length=300)


class ReferralCreate(BaseModel):
    facility: str = Field(min_length=2, max_length=120)
    reason: str = Field(min_length=2, max_length=250)
    appointment_date: Optional[date] = None


class ReferralUpdate(BaseModel):
    status: str


def _row(row):
    return dict(row) if row else None




def _audit(connection, user, action, target_type, target_id, details=""):
    connection.execute("""INSERT INTO activity_logs
        (actor_user_id,actor_name,actor_role,action,target_type,target_id,details)
        VALUES (?,?,?,?,?,?,?)""",
        (user.get("sub"), user.get("name", "Demo user"), user.get("role", "unknown"),
         action, target_type, str(target_id), details[:500]))


def _get_patient(connection, journey_id):
    row = connection.execute(
        "SELECT * FROM demo_patients WHERE journey_id = ?", (journey_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Demo journey not found")
    return row


@router.post("", status_code=201)
def create_journey(payload: PatientCreate, user: dict = Depends(get_current_user)):
    journey_id = "SSJ-" + uuid4().hex[:8].upper()
    connection = get_connection()
    try:
        connection.execute("""
            INSERT INTO demo_patients
            (journey_id, name, age, phone, sex, notes, current_stage, owner_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (journey_id, payload.name.strip(), payload.age, payload.phone,
              payload.sex, payload.notes, "Registration", user["sub"] if user["role"] == "patient" else None))
        connection.execute("""
            INSERT INTO journey_events (journey_id, stage, status, note)
            VALUES (?, 'Registration', 'Completed', 'Demo profile created')
        """, (journey_id,))
        _audit(connection, user, "Created demo journey", "journey", journey_id, "Synthetic patient journey created")
        connection.commit()
        return _journey_payload(connection, journey_id)
    except sqlite3.IntegrityError:
        connection.rollback()
        raise HTTPException(status_code=409, detail="Could not create this demo journey")
    finally:
        connection.close()


@router.get("")
def list_journeys(user: dict = Depends(get_current_user)):
    connection = get_connection()
    try:
        rows = connection.execute("""
            SELECT p.*,
              (SELECT COUNT(*) FROM journey_referrals r WHERE r.journey_id=p.journey_id) AS referral_count,
              (SELECT COUNT(*) FROM journey_referrals r WHERE r.journey_id=p.journey_id
                AND r.status != 'Follow-up complete') AS open_referrals
            FROM demo_patients p
            WHERE (? != 'patient' OR p.owner_user_id = ?)
            ORDER BY p.created_at DESC
        """, (user["role"], user["sub"])).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def _journey_payload(connection, journey_id: str):
    patient = _get_patient(connection, journey_id)
    events = connection.execute("""
        SELECT * FROM journey_events WHERE journey_id=?
        ORDER BY created_at ASC, id ASC
    """, (journey_id,)).fetchall()
    referrals = connection.execute("""
        SELECT * FROM journey_referrals WHERE journey_id=?
        ORDER BY created_at DESC, id DESC
    """, (journey_id,)).fetchall()
    return {"patient": dict(patient), "events": [dict(row) for row in events],
            "referrals": [dict(row) for row in referrals], "stages": STAGES}


@router.get("/{journey_id}")
def get_journey(journey_id: str, user: dict = Depends(get_current_user)):
    connection = get_connection()
    try:
        patient = _get_patient(connection, journey_id)
        if user["role"] == "patient" and patient["owner_user_id"] != user["sub"]:
            raise HTTPException(status_code=403, detail="You can only view your own demo journey")
        return _journey_payload(connection, journey_id)
    finally:
        connection.close()


@router.post("/{journey_id}/events", status_code=201)
def add_event(journey_id: str, payload: EventCreate, user: dict = Depends(require_roles("health_worker", "admin"))):
    if payload.stage not in STAGES:
        raise HTTPException(status_code=400, detail="Unknown journey stage")
    if payload.status not in ["Completed", "In progress", "Pending", "Not applicable"]:
        raise HTTPException(status_code=400, detail="Invalid event status")
    connection = get_connection()
    try:
        _get_patient(connection, journey_id)
        connection.execute("""
            INSERT INTO journey_events (journey_id, stage, status, note)
            VALUES (?, ?, ?, ?)
        """, (journey_id, payload.stage, payload.status, payload.note))
        if payload.status in ["Completed", "In progress"]:
            connection.execute("""
                UPDATE demo_patients SET current_stage=? WHERE journey_id=?
            """, (payload.stage, journey_id))
        _audit(connection, user, "Added journey event", "journey", journey_id, f"stage={payload.stage}; status={payload.status}")
        connection.commit()
        return _journey_payload(connection, journey_id)
    finally:
        connection.close()


@router.post("/{journey_id}/referrals", status_code=201)
def create_referral(journey_id: str, payload: ReferralCreate, user: dict = Depends(require_roles("health_worker", "admin"))):
    referral_code = "REF-" + uuid4().hex[:8].upper()
    connection = get_connection()
    try:
        _get_patient(connection, journey_id)
        connection.execute("""
            INSERT INTO journey_referrals
            (referral_code, journey_id, facility, reason, appointment_date, status)
            VALUES (?, ?, ?, ?, ?, 'New')
        """, (referral_code, journey_id, payload.facility.strip(),
              payload.reason.strip(),
              payload.appointment_date.isoformat() if payload.appointment_date else None))
        connection.execute("""
            INSERT INTO journey_events (journey_id, stage, status, note)
            VALUES (?, 'Referral', 'In progress', ?)
        """, (journey_id, "Created demo referral " + referral_code))
        connection.execute("""
            UPDATE demo_patients SET current_stage='Referral' WHERE journey_id=?
        """, (journey_id,))
        _audit(connection, user, "Created referral", "referral", referral_code, f"journey={journey_id}; facility={payload.facility.strip()}")
        connection.commit()
        row = connection.execute(
            "SELECT * FROM journey_referrals WHERE referral_code=?", (referral_code,)
        ).fetchone()
        return dict(row)
    finally:
        connection.close()


@router.patch("/{journey_id}/referrals/{referral_id}")
def update_referral(journey_id: str, referral_id: int, payload: ReferralUpdate, user: dict = Depends(require_roles("health_worker", "admin"))):
    if payload.status not in REFERRAL_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid referral status")
    connection = get_connection()
    try:
        _get_patient(connection, journey_id)
        result = connection.execute("""
            UPDATE journey_referrals SET status=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=? AND journey_id=?
        """, (payload.status, referral_id, journey_id))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Referral not found")
        connection.execute("""
            INSERT INTO journey_events (journey_id, stage, status, note)
            VALUES (?, ?, 'Completed', ?)
        """, (journey_id,
              "Follow-up" if payload.status == "Follow-up complete" else "Referral",
              "Referral status updated to " + payload.status))
        if payload.status == "Follow-up complete":
            connection.execute("""
                UPDATE demo_patients SET current_stage='Follow-up' WHERE journey_id=?
            """, (journey_id,))
        _audit(connection, user, "Updated referral", "referral", referral_id, f"journey={journey_id}; status={payload.status}")
        connection.commit()
        return _journey_payload(connection, journey_id)
    finally:
        connection.close()
