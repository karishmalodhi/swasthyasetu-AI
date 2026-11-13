from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from backend.database import get_connection

router = APIRouter(
    prefix="/api/health-metrics",
    tags=["Health Metrics"]
)


class HealthReading(BaseModel):
    patient_id: str
    measurement_type: str
    value: float
    secondary_value: Optional[float] = None


@router.post("/")
def save_health_reading(reading: HealthReading):
    connection = get_connection()

    try:
        cursor = connection.execute("""
            INSERT INTO health_readings
            (patient_id, measurement_type, value, secondary_value)
            VALUES (?, ?, ?, ?)
        """, (
            reading.patient_id,
            reading.measurement_type,
            reading.value,
            reading.secondary_value
        ))

        connection.commit()

        return {
            "message": "Health reading saved successfully",
            "id": cursor.lastrowid
        }

    except Exception as error:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(error))

    finally:
        connection.close()


@router.get("/{patient_id}")
def get_health_readings(patient_id: str):
    connection = get_connection()

    try:
        rows = connection.execute("""
            SELECT * FROM health_readings
            WHERE patient_id = ?
            ORDER BY recorded_at DESC
        """, (patient_id,)).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()
