import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "swasthyasetu.db"

def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection

def create_tables():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS maternal_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            age INTEGER,
            lmp TEXT,
            edd TEXT,
            phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS maternal_appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            appointment_date TEXT NOT NULL,
            appointment_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS health_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            measurement_type TEXT NOT NULL,
            value REAL NOT NULL,
            secondary_value REAL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)


    # Unified Patient Journey: fictional demonstration records only.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS demo_patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            journey_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            age INTEGER,
            phone TEXT,
            sex TEXT,
            notes TEXT,
            current_stage TEXT NOT NULL DEFAULT 'Registration',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS journey_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            journey_id TEXT NOT NULL,
            stage TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Completed',
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (journey_id) REFERENCES demo_patients(journey_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS journey_referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referral_code TEXT UNIQUE NOT NULL,
            journey_id TEXT NOT NULL,
            facility TEXT NOT NULL,
            reason TEXT NOT NULL,
            appointment_date TEXT,
            status TEXT NOT NULL DEFAULT 'New',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (journey_id) REFERENCES demo_patients(journey_id)
        )
    """)

    # Role-based demo accounts. Existing application tables remain untouched.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS app_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('patient','health_worker','admin')),
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Backward-compatible migrations for databases created before RBAC/Admin 2.0.
    patient_columns = {row[1] for row in cursor.execute("PRAGMA table_info(demo_patients)").fetchall()}
    if "owner_user_id" not in patient_columns:
        cursor.execute("ALTER TABLE demo_patients ADD COLUMN owner_user_id INTEGER")
    if "assigned_worker_id" not in patient_columns:
        cursor.execute("ALTER TABLE demo_patients ADD COLUMN assigned_worker_id INTEGER")
    user_columns = {row[1] for row in cursor.execute("PRAGMA table_info(app_users)").fetchall()}
    if "is_active" not in user_columns:
        cursor.execute("ALTER TABLE app_users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_user_id INTEGER,
            actor_name TEXT NOT NULL,
            actor_role TEXT NOT NULL,
            action TEXT NOT NULL,
            target_type TEXT NOT NULL,
            target_id TEXT,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Seed clearly labelled fictional staff accounts for local demonstration only.
    from backend.security import hash_password
    for name, email, password, role in [
        ("Demo Health Worker", "worker@demo.swasthyasetu", "WorkerDemo123!", "health_worker"),
        ("Demo Administrator", "admin@demo.swasthyasetu", "AdminDemo123!", "admin"),
    ]:
        exists = cursor.execute("SELECT id FROM app_users WHERE email=?", (email,)).fetchone()
        if not exists:
            cursor.execute("INSERT INTO app_users (name,email,password_hash,role) VALUES (?,?,?,?)",
                           (name, email, hash_password(password), role))

    connection.commit()
    connection.close()
