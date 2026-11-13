
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta

from backend.database import get_connection

router = APIRouter(prefix="/api/maternal", tags=["MaternalCare"])


class MaternalProfile(BaseModel):
    patient_id: str
    name: str
    age: Optional[int] = None
    lmp: Optional[date] = None
    phone: Optional[str] = None


class Appointment(BaseModel):
    appointment_date: date
    appointment_reason: Optional[str] = None


@router.post("/")
def save_maternal_profile(profile: MaternalProfile):
    connection = get_connection()

    try:
        name = profile.name.strip()

        if not name:
            raise HTTPException(status_code=400, detail="Name is required")

        edd = (
            profile.lmp + timedelta(days=280)
            if profile.lmp else None
        )

        connection.execute("""
            INSERT INTO maternal_records
            (patient_id, name, age, lmp, edd, phone)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(patient_id) DO UPDATE SET
                name = excluded.name,
                age = excluded.age,
                lmp = excluded.lmp,
                edd = excluded.edd,
                phone = excluded.phone
        """, (
            profile.patient_id,
            name,
            profile.age,
            profile.lmp.isoformat() if profile.lmp else None,
            edd.isoformat() if edd else None,
            profile.phone
        ))

        connection.commit()

        return {
            "success": True,
            "message": "Maternal profile saved successfully",
            "patient_id": profile.patient_id,
            "name": name,
            "age": profile.age,
            "lmp": profile.lmp.isoformat() if profile.lmp else None,
            "edd": edd.isoformat() if edd else None,
            "phone": profile.phone
        }

    except HTTPException:
        raise

    except Exception as error:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(error))

    finally:
        connection.close()


@router.get("/{patient_id}")
def get_maternal_profile(patient_id: str):
    connection = get_connection()

    try:
        row = connection.execute("""
            SELECT * FROM maternal_records
            WHERE patient_id = ?
        """, (patient_id,)).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Maternal profile not found"
            )

        data = dict(row)

        if data["lmp"]:
            lmp_date = date.fromisoformat(data["lmp"])
            days = max(0, (date.today() - lmp_date).days)
            data["pregnancy_week"] = days // 7
            data["pregnancy_day"] = days % 7
        else:
            data["pregnancy_week"] = None
            data["pregnancy_day"] = None

        return data

    finally:
        connection.close()


@router.post("/{patient_id}/appointments")
def save_appointment(patient_id: str, appointment: Appointment):
    connection = get_connection()

    try:
        patient = connection.execute("""
            SELECT patient_id FROM maternal_records
            WHERE patient_id = ?
        """, (patient_id,)).fetchone()

        if patient is None:
            raise HTTPException(
                status_code=404,
                detail="Please save the maternal profile first"
            )

        cursor = connection.execute("""
            INSERT INTO maternal_appointments
            (patient_id, appointment_date, appointment_reason)
            VALUES (?, ?, ?)
        """, (
            patient_id,
            appointment.appointment_date.isoformat(),
            appointment.appointment_reason
        ))

        connection.commit()

        return {
            "success": True,
            "message": "Appointment saved successfully",
            "appointment_id": cursor.lastrowid
        }

    except HTTPException:
        raise

    except Exception as error:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(error))

    finally:
        connection.close()


@router.get("/{patient_id}/appointments")
def get_appointments(patient_id: str):
    connection = get_connection()

    try:
        rows = connection.execute("""
            SELECT * FROM maternal_appointments
            WHERE patient_id = ?
            ORDER BY appointment_date DESC
        """, (patient_id,)).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()
