"""Administrator workspace APIs for synthetic SwasthyaSetu demonstrations.
Includes AI-assisted operational summaries and impact metrics.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from backend.database import get_connection
from backend.security import require_roles

router = APIRouter(prefix="/api/admin", tags=["Admin Panel 2.0"])


class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AssignmentInput(BaseModel):
    worker_id: Optional[int] = Field(default=None, ge=1)


def _log(connection, actor, action, target_type, target_id, details=""):
    connection.execute(
        """INSERT INTO activity_logs
        (actor_user_id,actor_name,actor_role,action,target_type,target_id,details)
        VALUES (?,?,?,?,?,?,?)""",
        (
            actor["sub"],
            actor.get("name", "Demo user"),
            actor["role"],
            action,
            target_type,
            str(target_id) if target_id is not None else None,
            details[:500],
        ),
    )


def _build_ai_summary(counts: dict, statuses: list, unassigned: int, high_priority_proxy: int) -> dict:
    """Generate a concise operational AI briefing from current demo metrics."""
    users = counts.get("users") or 0
    workers = counts.get("active_workers") or 0
    journeys = counts.get("journeys") or 0
    open_ref = counts.get("open_referrals") or 0
    assigned = counts.get("assigned_journeys") or 0

    bullets = []
    if journeys == 0:
        bullets.append("No demo journeys exist yet. Create sample journeys from the Patient Journey page to exercise coordination workflows.")
    else:
        coverage = round((assigned / journeys) * 100) if journeys else 0
        bullets.append(f"{assigned} of {journeys} demo journeys currently have an assigned health worker ({coverage}% coverage).")

    if unassigned > 0:
        bullets.append(f"{unassigned} journey(s) remain unassigned — prioritise worker allocation for these cases.")
    else:
        bullets.append("All existing demo journeys have worker assignments.")

    if open_ref > 0:
        bullets.append(f"There are {open_ref} open referral(s). Review the referral status breakdown to clear bottlenecks.")
    else:
        bullets.append("No open referrals at the moment — coordination backlog is clear on this metric.")

    if workers == 0:
        bullets.append("No active health-worker accounts. Activate or create a health-worker account before assigning journeys.")
    elif workers == 1:
        bullets.append("Only one active health worker is available. Consider adding capacity for realistic load distribution demos.")
    else:
        bullets.append(f"{workers} active health workers are available for assignment.")

    if high_priority_proxy > 0:
        bullets.append(f"Approximately {high_priority_proxy} journey(s) show higher coordination signals (longer stages or multiple open items).")

    # Simple fairness / balance note (demo only)
    fairness = "Role distribution looks usable for demos." if users >= 2 else "Limited accounts — register additional fictional users to exercise RBAC."
    if workers and journeys and assigned < journeys:
        fairness = "Worker assignment is uneven relative to journey volume — useful for demonstrating prioritisation."

    headline = "Operational posture is healthy." if open_ref == 0 and unassigned == 0 else "Attention needed on coordination backlog."
    if journeys == 0:
        headline = "Platform is ready — seed demo journeys to begin."

    return {
        "headline": headline,
        "bullets": bullets[:6],
        "fairness_note": fairness,
        "generated": "rule-based operational summary (synthetic data only)",
    }


@router.get("/overview")
def overview(user: dict = Depends(require_roles("admin"))):
    connection = get_connection()
    try:
        counts = connection.execute(
            """SELECT
            (SELECT COUNT(*) FROM app_users) AS users,
            (SELECT COUNT(*) FROM app_users WHERE is_active=1) AS active_users,
            (SELECT COUNT(*) FROM app_users WHERE role='health_worker' AND is_active=1) AS active_workers,
            (SELECT COUNT(*) FROM app_users WHERE role='patient') AS patients,
            (SELECT COUNT(*) FROM app_users WHERE role='admin' AND is_active=1) AS admins,
            (SELECT COUNT(*) FROM demo_patients) AS journeys,
            (SELECT COUNT(*) FROM journey_referrals) AS referrals,
            (SELECT COUNT(*) FROM journey_referrals WHERE status!='Follow-up complete') AS open_referrals,
            (SELECT COUNT(*) FROM demo_patients WHERE assigned_worker_id IS NOT NULL) AS assigned_journeys
        """
        ).fetchone()
        counts = dict(counts)

        statuses = connection.execute(
            """SELECT status, COUNT(*) AS count
            FROM journey_referrals GROUP BY status ORDER BY status"""
        ).fetchall()
        status_list = [dict(r) for r in statuses]

        unassigned = (counts.get("journeys") or 0) - (counts.get("assigned_journeys") or 0)

        # Proxy for higher-coordination cases (demo heuristic)
        high_priority_proxy = connection.execute(
            """SELECT COUNT(*) FROM demo_patients
               WHERE current_stage IN ('Referral pending','Needs follow-up','Escalated')
                  OR (assigned_worker_id IS NULL AND journey_id IS NOT NULL)"""
        ).fetchone()[0]

        # Role distribution for fairness view
        role_dist = connection.execute(
            """SELECT role, COUNT(*) AS count FROM app_users GROUP BY role ORDER BY role"""
        ).fetchall()

        # Recent activity count (last 24h proxy – all recent for demo)
        recent_actions = connection.execute(
            "SELECT COUNT(*) FROM activity_logs"
        ).fetchone()[0]

        ai_summary = _build_ai_summary(counts, status_list, unassigned, high_priority_proxy)

        return {
            "counts": counts,
            "referrals_by_status": status_list,
            "unassigned_journeys": unassigned,
            "high_priority_proxy": high_priority_proxy,
            "role_distribution": [dict(r) for r in role_dist],
            "recent_admin_actions": recent_actions,
            "ai_summary": ai_summary,
            "impact": {
                "demo_journeys_created": counts.get("journeys") or 0,
                "referrals_tracked": counts.get("referrals") or 0,
                "open_coordination_items": counts.get("open_referrals") or 0,
                "worker_coverage_pct": round(
                    ((counts.get("assigned_journeys") or 0) / max(counts.get("journeys") or 1, 1)) * 100
                ),
                "active_staff": (counts.get("active_workers") or 0) + (counts.get("admins") or 0),
            },
        }
    finally:
        connection.close()


@router.get("/users")
def users(user: dict = Depends(require_roles("admin"))):
    connection = get_connection()
    try:
        rows = connection.execute(
            """SELECT id,name,email,role,is_active,created_at
            FROM app_users ORDER BY created_at DESC,id DESC"""
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        connection.close()


@router.patch("/users/{user_id}")
def update_user(user_id: int, payload: UserUpdate, user: dict = Depends(require_roles("admin"))):
    if payload.role is None and payload.is_active is None:
        raise HTTPException(status_code=400, detail="Provide a role or active-state change")
    if payload.role is not None and payload.role not in {"patient", "health_worker", "admin"}:
        raise HTTPException(status_code=400, detail="Role must be patient, health_worker or admin")
    if user_id == user["sub"] and payload.is_active is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own admin account")
    connection = get_connection()
    try:
        target = connection.execute("SELECT * FROM app_users WHERE id=?", (user_id,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Account not found")
        new_role = payload.role or target["role"]
        new_active = int(payload.is_active) if payload.is_active is not None else target["is_active"]
        if target["role"] == "admin" and target["is_active"] and (new_role != "admin" or not new_active):
            remaining = connection.execute(
                "SELECT COUNT(*) FROM app_users WHERE role='admin' AND is_active=1 AND id!=?", (user_id,)
            ).fetchone()[0]
            if remaining == 0:
                raise HTTPException(status_code=400, detail="At least one active administrator must remain")
        connection.execute(
            "UPDATE app_users SET role=?,is_active=? WHERE id=?", (new_role, new_active, user_id)
        )
        _log(
            connection,
            user,
            "Updated account",
            "user",
            user_id,
            f"role={new_role}; active={bool(new_active)}",
        )
        connection.commit()
        return {
            "message": "Account updated. The user's old session will no longer work.",
            "user_id": user_id,
            "role": new_role,
            "is_active": bool(new_active),
        }
    finally:
        connection.close()


@router.get("/workers")
def workers(user: dict = Depends(require_roles("admin"))):
    connection = get_connection()
    try:
        rows = connection.execute(
            """SELECT id,name,email FROM app_users
            WHERE role='health_worker' AND is_active=1 ORDER BY name"""
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        connection.close()


@router.get("/journeys")
def journeys(user: dict = Depends(require_roles("admin"))):
    connection = get_connection()
    try:
        rows = connection.execute(
            """SELECT p.journey_id,p.name,p.current_stage,p.created_at,
            p.assigned_worker_id,u.name AS assigned_worker,
            (SELECT COUNT(*) FROM journey_referrals r WHERE r.journey_id=p.journey_id) AS referral_count
            FROM demo_patients p LEFT JOIN app_users u ON u.id=p.assigned_worker_id
            ORDER BY p.created_at DESC"""
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        connection.close()


@router.patch("/journeys/{journey_id}/assignment")
def assign_worker(journey_id: str, payload: AssignmentInput, user: dict = Depends(require_roles("admin"))):
    connection = get_connection()
    try:
        patient = connection.execute(
            "SELECT journey_id FROM demo_patients WHERE journey_id=?", (journey_id,)
        ).fetchone()
        if not patient:
            raise HTTPException(status_code=404, detail="Demo journey not found")
        if payload.worker_id is not None:
            worker = connection.execute(
                "SELECT id FROM app_users WHERE id=? AND role='health_worker' AND is_active=1",
                (payload.worker_id,),
            ).fetchone()
            if not worker:
                raise HTTPException(status_code=400, detail="Choose an active health-worker account")
        connection.execute(
            "UPDATE demo_patients SET assigned_worker_id=? WHERE journey_id=?",
            (payload.worker_id, journey_id),
        )
        _log(
            connection,
            user,
            "Assigned health worker" if payload.worker_id else "Removed health-worker assignment",
            "journey",
            journey_id,
            f"worker_id={payload.worker_id}",
        )
        connection.commit()
        return {"journey_id": journey_id, "assigned_worker_id": payload.worker_id}
    finally:
        connection.close()


@router.get("/activity")
def activity(limit: int = Query(default=50, ge=1, le=200), user: dict = Depends(require_roles("admin"))):
    connection = get_connection()
    try:
        rows = connection.execute(
            """SELECT id,actor_name,actor_role,action,target_type,target_id,details,created_at
            FROM activity_logs ORDER BY created_at DESC,id DESC LIMIT ?""",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        connection.close()


@router.post("/seed-demo")
def seed_demo_data(user: dict = Depends(require_roles("admin"))):
    """Insert a realistic set of fictional journeys, events and referrals for live demos."""
    connection = get_connection()
    try:
        existing = connection.execute("SELECT COUNT(*) FROM demo_patients").fetchone()[0]
        if existing >= 6:
            return {
                "message": "Demo data already present. Clear journeys first if you want a fresh seed.",
                "journeys": existing,
                "seeded": False,
            }

        worker = connection.execute(
            "SELECT id FROM app_users WHERE role='health_worker' AND is_active=1 ORDER BY id LIMIT 1"
        ).fetchone()
        worker_id = worker["id"] if worker else None

        samples = [
            {
                "journey_id": "DEMO-J-101",
                "name": "Asha Devi (synthetic)",
                "age": 28,
                "phone": "90000-10001",
                "sex": "F",
                "notes": "Fictional maternal follow-up pathway",
                "current_stage": "Antenatal check",
                "events": [
                    ("Registration", "Completed", "Synthetic registration recorded"),
                    ("Antenatal check", "In progress", "First trimester coordination note"),
                ],
                "referrals": [
                    ("REF-101A", "Community Health Centre", "Routine antenatal coordination", "2026-11-20", "Scheduled"),
                ],
                "assign": True,
            },
            {
                "journey_id": "DEMO-J-102",
                "name": "Ramesh Kumar (synthetic)",
                "age": 45,
                "phone": "90000-10002",
                "sex": "M",
                "notes": "Fictional chronic follow-up pathway",
                "current_stage": "Needs follow-up",
                "events": [
                    ("Registration", "Completed", "Synthetic profile created"),
                    ("Initial screening", "Completed", "Coordination screening logged"),
                    ("Needs follow-up", "Open", "Missed contact window"),
                ],
                "referrals": [
                    ("REF-102A", "District Hospital", "Scheduling coordination", "2026-11-18", "In progress"),
                ],
                "assign": True,
            },
            {
                "journey_id": "DEMO-J-103",
                "name": "Sunita Bai (synthetic)",
                "age": 32,
                "phone": "90000-10003",
                "sex": "F",
                "notes": "Fictional high-coordination pathway",
                "current_stage": "Referral pending",
                "events": [
                    ("Registration", "Completed", "Synthetic registration"),
                    ("Screening", "Completed", "Multiple open tasks noted"),
                    ("Referral pending", "Open", "Awaiting facility slot"),
                ],
                "referrals": [
                    ("REF-103A", "Specialist Clinic", "Coordination referral", "2026-11-22", "New"),
                    ("REF-103B", "Primary Health Centre", "Local follow-up", None, "New"),
                ],
                "assign": False,
            },
            {
                "journey_id": "DEMO-J-104",
                "name": "Imran Sheikh (synthetic)",
                "age": 51,
                "phone": "90000-10004",
                "sex": "M",
                "notes": "Fictional completed coordination example",
                "current_stage": "Follow-up complete",
                "events": [
                    ("Registration", "Completed", "Synthetic registration"),
                    ("Follow-up", "Completed", "All coordination tasks closed"),
                ],
                "referrals": [
                    ("REF-104A", "Community Health Centre", "Closed coordination", "2026-11-10", "Follow-up complete"),
                ],
                "assign": True,
            },
            {
                "journey_id": "DEMO-J-105",
                "name": "Lakshmi N. (synthetic)",
                "age": 24,
                "phone": "90000-10005",
                "sex": "F",
                "notes": "Fictional early-stage pathway",
                "current_stage": "Registration",
                "events": [
                    ("Registration", "Completed", "Just registered for demo"),
                ],
                "referrals": [],
                "assign": False,
            },
            {
                "journey_id": "DEMO-J-106",
                "name": "Vijay Patil (synthetic)",
                "age": 39,
                "phone": "90000-10006",
                "sex": "M",
                "notes": "Fictional mid-pathway case",
                "current_stage": "Screening",
                "events": [
                    ("Registration", "Completed", "Synthetic registration"),
                    ("Screening", "In progress", "Coordination screening in progress"),
                ],
                "referrals": [
                    ("REF-106A", "District Hospital", "Diagnostic coordination", "2026-11-25", "Scheduled"),
                ],
                "assign": True,
            },
        ]

        created = 0
        for s in samples:
            exists = connection.execute(
                "SELECT 1 FROM demo_patients WHERE journey_id=?", (s["journey_id"],)
            ).fetchone()
            if exists:
                continue
            assigned = worker_id if s["assign"] and worker_id else None
            connection.execute(
                """INSERT INTO demo_patients
                   (journey_id, name, age, phone, sex, notes, current_stage, assigned_worker_id)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (
                    s["journey_id"],
                    s["name"],
                    s["age"],
                    s["phone"],
                    s["sex"],
                    s["notes"],
                    s["current_stage"],
                    assigned,
                ),
            )
            for stage, status, note in s["events"]:
                connection.execute(
                    """INSERT INTO journey_events (journey_id, stage, status, note)
                       VALUES (?,?,?,?)""",
                    (s["journey_id"], stage, status, note),
                )
            for code, facility, reason, appt, status in s["referrals"]:
                connection.execute(
                    """INSERT INTO journey_referrals
                       (referral_code, journey_id, facility, reason, appointment_date, status)
                       VALUES (?,?,?,?,?,?)""",
                    (code, s["journey_id"], facility, reason, appt, status),
                )
            created += 1

        _log(
            connection,
            user,
            "Seeded demo data",
            "system",
            "seed",
            f"created={created} fictional journeys",
        )
        connection.commit()
        total = connection.execute("SELECT COUNT(*) FROM demo_patients").fetchone()[0]
        return {
            "message": f"Seeded {created} new fictional journeys for demonstration.",
            "journeys": total,
            "seeded": True,
            "notice": "All names, phones and pathways are synthetic. Do not use real patient data.",
        }
    finally:
        connection.close()
