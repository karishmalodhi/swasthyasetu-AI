import os
import sqlite3
from pathlib import Path
from datetime import date
from typing import Optional, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq

from backend.database import get_connection


# Load .env from project root
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

router = APIRouter(
    prefix="/api/ai",
    tags=["AI Features"]
)

MODEL_NAME = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


# --------------------------------------------------
# DATABASE TABLES
# --------------------------------------------------

def create_ai_tables():
    connection = get_connection()

    try:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS ai_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                feature TEXT NOT NULL,
                user_input TEXT,
                ai_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS vaccination_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                vaccine_name TEXT NOT NULL,
                due_date TEXT,
                administered_date TEXT,
                status TEXT DEFAULT 'Pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        connection.commit()

    finally:
        connection.close()


create_ai_tables()


# --------------------------------------------------
# GROQ AI CONNECTION
# --------------------------------------------------

def ask_groq(prompt: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY missing. Add GROQ_API_KEY to your .env file."
        )

    try:
        client = Groq(api_key=api_key)

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a careful maternal healthcare information "
                        "assistant. Give clear, practical information. "
                        "Never claim to diagnose or replace a doctor. "
                        "For emergency symptoms, advise immediate medical care."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_completion_tokens=2000
        )

        answer = response.choices[0].message.content

        if not answer:
            raise ValueError("The AI returned an empty response.")

        return answer

    except HTTPException:
        raise

    except Exception as error:
        print("Groq API error:", str(error))
        raise HTTPException(
            status_code=502,
            detail="Groq API request failed. Check your API key, model name and Groq account."
        )


# --------------------------------------------------
# SAVE AI HISTORY
# --------------------------------------------------

def save_ai_history(patient_id, feature, user_input, ai_response):
    connection = get_connection()

    try:
        connection.execute("""
            INSERT INTO ai_history
            (patient_id, feature, user_input, ai_response)
            VALUES (?, ?, ?, ?)
        """, (
            patient_id,
            feature,
            user_input,
            ai_response
        ))

        connection.commit()

    finally:
        connection.close()


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class NutritionRequest(BaseModel):
    patient_id: str
    age: int
    pregnancy_week: int
    diet_preference: str
    allergies: str = "None"
    health_conditions: str = "None"


class SymptomRequest(BaseModel):
    patient_id: str
    pregnancy_week: int
    symptoms: str
    known_conditions: str = "None"


class VaccinationRequest(BaseModel):
    patient_id: str
    vaccine_name: str
    due_date: str
    administered_date: Optional[str] = None
    status: Literal["Pending", "Completed"] = "Pending"
    notes: Optional[str] = None


class VaccinationUpdate(BaseModel):
    status: Optional[Literal["Pending", "Completed"]] = None
    administered_date: Optional[str] = None
    notes: Optional[str] = None


# --------------------------------------------------
# AI NUTRITION
# --------------------------------------------------

@router.post("/nutrition")
def generate_nutrition(request: NutritionRequest):

    prompt = f"""
    Create a personalized pregnancy nutrition plan.

    Patient age: {request.age}
    Pregnancy week: {request.pregnancy_week}
    Diet preference: {request.diet_preference}
    Allergies: {request.allergies}
    Health conditions: {request.health_conditions}

    Include:
    1. Recommended daily food choices.
    2. Breakfast, lunch, evening snack and dinner suggestions.
    3. Important nutrients and their food sources.
    4. Foods to avoid or limit during pregnancy.
    5. Hydration advice.

    Use affordable Indian foods and simple language.
    Consider the patient's allergies and health conditions.
    Do not prescribe medicines or supplements.
    Advise consulting a qualified doctor for individual medical advice.
    """

    result = ask_groq(prompt)

    save_ai_history(
        request.patient_id,
        "Nutrition",
        prompt,
        result
    )

    return {
        "message": "Nutrition plan generated successfully",
        "patient_id": request.patient_id,
        "ai_response": result
    }


# --------------------------------------------------
# AI SYMPTOM CHECKER
# --------------------------------------------------

@router.post("/symptom-check")
def check_symptoms(request: SymptomRequest):

    prompt = f"""
    A pregnant patient has reported the following symptoms.

    Pregnancy week: {request.pregnancy_week}
    Symptoms: {request.symptoms}
    Known medical conditions: {request.known_conditions}

    Provide:
    1. Possible explanations (not a diagnosis).
    2. Whether symptoms may be common or concerning.
    3. Recommended next steps.
    4. When to contact a doctor.
    5. Whether immediate medical attention is needed.

    IMPORTANT:
    Heavy vaginal bleeding, severe abdominal pain, seizures,
    fainting, chest pain, difficulty breathing, severe headache,
    blurred vision, fluid leakage or reduced fetal movement
    can require urgent medical assessment.

    If any emergency warning sign is reported, clearly advise
    immediate medical evaluation. Do not delay emergency care
    while using this chatbot.

    Never claim to provide a medical diagnosis.
    """

    result = ask_groq(prompt)

    save_ai_history(
        request.patient_id,
        "Symptom Checker",
        request.symptoms,
        result
    )

    return {
        "message": "Symptom analysis generated successfully",
        "patient_id": request.patient_id,
        "disclaimer": "This is informational guidance, not a medical diagnosis.",
        "ai_response": result
    }


# --------------------------------------------------
# VACCINATION GUIDANCE
# --------------------------------------------------

@router.get("/vaccination-guidance")
def vaccination_guidance():

    return {
        "message": "General pregnancy vaccination information",
        "note": "Vaccination schedules must be confirmed with a qualified healthcare professional.",
        "vaccines": [
            {
                "name": "Td-1",
                "recommended_timing": "Early in pregnancy, as advised by the healthcare provider"
            },
            {
                "name": "Td-2",
                "recommended_timing": "At least 4 weeks after Td-1, as advised by the healthcare provider"
            },
            {
                "name": "Td Booster",
                "recommended_timing": "May be advised based on previous vaccination history"
            }
        ]
    }


# --------------------------------------------------
# SAVE VACCINATION
# --------------------------------------------------

@router.post("/vaccinations")
def save_vaccination(request: VaccinationRequest):

    connection = get_connection()

    try:
        cursor = connection.execute("""
            INSERT INTO vaccination_records
            (
                patient_id,
                vaccine_name,
                due_date,
                administered_date,
                status,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            request.patient_id,
            request.vaccine_name,
            request.due_date,
            request.administered_date,
            request.status,
            request.notes
        ))

        connection.commit()

        return {
            "message": "Vaccination record saved successfully",
            "id": cursor.lastrowid
        }

    except Exception as error:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(error))

    finally:
        connection.close()


# --------------------------------------------------
# GET VACCINATIONS
# --------------------------------------------------

@router.get("/vaccinations/{patient_id}")
def get_vaccinations(patient_id: str):

    connection = get_connection()

    try:
        rows = connection.execute("""
            SELECT * FROM vaccination_records
            WHERE patient_id = ?
            ORDER BY due_date ASC
        """, (patient_id,)).fetchall()

        records = []

        for row in rows:
            record = dict(row)

            if record["status"] == "Completed":
                record["display_status"] = "Completed"

            elif record["due_date"] and record["due_date"] < date.today().isoformat():
                record["display_status"] = "Overdue"

            else:
                record["display_status"] = "Pending"

            records.append(record)

        return records

    finally:
        connection.close()


# --------------------------------------------------
# UPDATE VACCINATION
# --------------------------------------------------

@router.put("/vaccinations/{record_id}")
def update_vaccination(record_id: int, request: VaccinationUpdate):

    updates = request.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No update information provided."
        )

    allowed_fields = {"status", "administered_date", "notes"}

    if not set(updates.keys()).issubset(allowed_fields):
        raise HTTPException(status_code=400, detail="Invalid update fields.")

    connection = get_connection()

    try:
        existing = connection.execute("""
            SELECT id FROM vaccination_records WHERE id = ?
        """, (record_id,)).fetchone()

        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Vaccination record not found."
            )

        set_clause = ", ".join(
            f"{field} = ?" for field in updates
        )

        values = list(updates.values())
        values.append(record_id)

        connection.execute(
            f"UPDATE vaccination_records SET {set_clause} WHERE id = ?",
            values
        )

        connection.commit()

        return {
            "message": "Vaccination record updated successfully"
        }

    finally:
        connection.close()


# --------------------------------------------------
# DELETE VACCINATION
# --------------------------------------------------

@router.delete("/vaccinations/{record_id}")
def delete_vaccination(record_id: int):

    connection = get_connection()

    try:
        cursor = connection.execute("""
            DELETE FROM vaccination_records WHERE id = ?
        """, (record_id,))

        connection.commit()

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Vaccination record not found."
            )

        return {
            "message": "Vaccination record deleted successfully"
        }

    finally:
        connection.close()


# --------------------------------------------------
# AI HISTORY
# --------------------------------------------------

@router.get("/history/{patient_id}")
def get_ai_history(patient_id: str):

    connection = get_connection()

    try:
        rows = connection.execute("""
            SELECT *
            FROM ai_history
            WHERE patient_id = ?
            ORDER BY created_at DESC
        """, (patient_id,)).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()