"""
SwasthyaSetu AI – Advanced Synthetic Care-Coordination Insights

Upgraded ML demo with:
- Multi-feature operational model
- Explainable predictions (feature contributions)
- Suggested next actions
- Optional scikit-learn RandomForest (falls back to pure-Python ensemble)

IMPORTANT: All data and targets are 100% synthetic.
This module does NOT predict disease, clinical risk, or medical outcomes.
It only demonstrates operational coordination prioritisation for a hackathon prototype.
"""

from __future__ import annotations

import math
import random
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/insights", tags=["AI Insights (Synthetic)"])

# ---------------------------------------------------------------------------
# Feature configuration
# ---------------------------------------------------------------------------
FEATURE_NAMES = [
    "days_since_last_contact",
    "missed_appointments_90d",
    "open_follow_up_tasks",
    "days_in_current_stage",
    "previous_escalations",
]

FEATURE_LABELS = {
    "days_since_last_contact": "Days since last contact",
    "missed_appointments_90d": "Missed appointments (90d)",
    "open_follow_up_tasks": "Open follow-up tasks",
    "days_in_current_stage": "Days in current stage",
    "previous_escalations": "Previous escalations",
}

# ---------------------------------------------------------------------------
# Pure-Python ensemble (works without sklearn)
# ---------------------------------------------------------------------------
def _synthetic_target(feats: dict[str, float]) -> float:
    """Invented coordination-load target used only for demo training."""
    return (
        feats["days_since_last_contact"] / 28.0
        + feats["missed_appointments_90d"] * 1.25
        + feats["open_follow_up_tasks"] * 0.9
        + feats["days_in_current_stage"] / 40.0
        + feats["previous_escalations"] * 1.4
    )


def _generate_training_data(n: int = 1200, seed: int = 42) -> list[tuple[dict, float]]:
    rng = random.Random(seed)
    data = []
    for _ in range(n):
        feats = {
            "days_since_last_contact": rng.randint(0, 90),
            "missed_appointments_90d": rng.randint(0, 5),
            "open_follow_up_tasks": rng.randint(0, 5),
            "days_in_current_stage": rng.randint(0, 60),
            "previous_escalations": rng.randint(0, 3),
        }
        # add mild noise
        target = _synthetic_target(feats) + rng.uniform(-0.35, 0.35)
        data.append((feats, max(0.0, target)))
    return data


class PurePythonTree:
    """Tiny decision stump / shallow tree for ensemble."""

    def __init__(self, feature: str, threshold: float, left_val: float, right_val: float):
        self.feature = feature
        self.threshold = threshold
        self.left_val = left_val
        self.right_val = right_val

    def predict(self, feats: dict) -> float:
        return self.left_val if feats[self.feature] <= self.threshold else self.right_val


class PurePythonEnsemble:
    """Simple bagging-style ensemble of decision stumps – fully explainable."""

    def __init__(self, n_trees: int = 40, seed: int = 7):
        self.trees: list[PurePythonTree] = []
        self.feature_importance: dict[str, float] = {f: 0.0 for f in FEATURE_NAMES}
        self._train(n_trees, seed)

    def _train(self, n_trees: int, seed: int):
        data = _generate_training_data(seed=seed)
        rng = random.Random(seed + 1)
        for _ in range(n_trees):
            # random feature + random threshold
            feat = rng.choice(FEATURE_NAMES)
            samples = rng.sample(data, k=min(180, len(data)))
            values = [s[0][feat] for s in samples]
            if not values:
                continue
            thr = rng.choice(values)
            left = [t for f, t in samples if f[feat] <= thr]
            right = [t for f, t in samples if f[feat] > thr]
            left_val = sum(left) / len(left) if left else 0.0
            right_val = sum(right) / len(right) if right else 0.0
            self.trees.append(PurePythonTree(feat, thr, left_val, right_val))
            # crude importance
            gain = abs(left_val - right_val)
            self.feature_importance[feat] += gain

        total = sum(self.feature_importance.values()) or 1.0
        self.feature_importance = {k: round(v / total, 4) for k, v in self.feature_importance.items()}

    def predict(self, feats: dict) -> float:
        if not self.trees:
            return 0.0
        return sum(t.predict(feats) for t in self.trees) / len(self.trees)

    def explain(self, feats: dict) -> list[dict]:
        """Return per-feature contribution approximation."""
        base = self.predict({f: 0 for f in FEATURE_NAMES})
        contributions = []
        for f in FEATURE_NAMES:
            # leave-one-out style contribution
            modified = dict(feats)
            modified[f] = 0
            without = self.predict(modified)
            contrib = self.predict(feats) - without
            contributions.append({
                "feature": f,
                "label": FEATURE_LABELS[f],
                "value": feats[f],
                "contribution": round(contrib, 3),
                "importance": self.feature_importance.get(f, 0.0),
            })
        contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        return contributions


# Try to use sklearn if available, otherwise pure-Python
USE_SKLEARN = False
SKLEARN_MODEL = None
SKLEARN_IMPORTANCE = {}

try:
    import numpy as np
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import train_test_split

    train_data = _generate_training_data(1600, seed=42)
    X = np.array([[d[0][f] for f in FEATURE_NAMES] for d in train_data])
    y = np.array([d[1] for d in train_data])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    SKLEARN_MODEL = RandomForestRegressor(
        n_estimators=80,
        max_depth=6,
        min_samples_leaf=4,
        random_state=42,
        n_jobs=1,
    )
    SKLEARN_MODEL.fit(X_train, y_train)
    score = SKLEARN_MODEL.score(X_test, y_test)
    SKLEARN_IMPORTANCE = {
        f: round(float(imp), 4)
        for f, imp in zip(FEATURE_NAMES, SKLEARN_MODEL.feature_importances_)
    }
    USE_SKLEARN = True
    MODEL_NAME = f"RandomForestRegressor (sklearn) · R²≈{score:.3f}"
except Exception:
    PURE_MODEL = PurePythonEnsemble(n_trees=48, seed=11)
    MODEL_NAME = "Explainable Ensemble (pure-Python fallback)"
    SKLEARN_IMPORTANCE = PURE_MODEL.feature_importance


def _predict_raw(feats: dict[str, float]) -> float:
    if USE_SKLEARN and SKLEARN_MODEL is not None:
        import numpy as np
        vec = np.array([[feats[f] for f in FEATURE_NAMES]])
        return float(SKLEARN_MODEL.predict(vec)[0])
    return PURE_MODEL.predict(feats)


def _explain(feats: dict[str, float]) -> list[dict]:
    if USE_SKLEARN and SKLEARN_MODEL is not None:
        # Approximate contribution via importance * scaled value
        pred = _predict_raw(feats)
        total_imp = sum(SKLEARN_IMPORTANCE.values()) or 1.0
        contribs = []
        for f in FEATURE_NAMES:
            # simple normalised contribution proxy
            scaled = feats[f] / (90.0 if "days" in f else 5.0)
            c = (SKLEARN_IMPORTANCE[f] / total_imp) * scaled * pred
            contribs.append({
                "feature": f,
                "label": FEATURE_LABELS[f],
                "value": feats[f],
                "contribution": round(c, 3),
                "importance": SKLEARN_IMPORTANCE[f],
            })
        contribs.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        return contribs
    return PURE_MODEL.explain(feats)


def _category_and_action(load: float) -> tuple[str, str, str]:
    if load < 2.2:
        return (
            "routine coordination",
            "routine",
            "Continue standard follow-up schedule. No escalation needed.",
        )
    if load < 4.8:
        return (
            "scheduling check-in recommended",
            "check_in",
            "Recommend a proactive contact within 48–72 hours and confirm next appointment.",
        )
    return (
        "higher coordination priority",
        "priority",
        "Prioritise outreach today. Consider assigning a health worker and reviewing open tasks.",
    )


def predict_full(feats: dict[str, float]) -> dict[str, Any]:
    load = max(0.0, round(_predict_raw(feats), 2))
    category, key, action = _category_and_action(load)
    explanations = _explain(feats)
    return {
        "coordination_load_index": load,
        "category": category,
        "category_key": key,
        "suggested_action": action,
        "explanations": explanations,
        "top_drivers": [e["label"] for e in explanations[:3]],
        "model": MODEL_NAME,
        "notice": NOTICE,
    }


# ---------------------------------------------------------------------------
# Demo cases (richer)
# ---------------------------------------------------------------------------
DEMO_CASES = [
    {
        "demo_id": "DEMO-001",
        "name": "Asha Devi (synthetic)",
        "days_since_last_contact": 7,
        "missed_appointments_90d": 0,
        "open_follow_up_tasks": 0,
        "days_in_current_stage": 5,
        "previous_escalations": 0,
        "history": ["Synthetic profile created", "Routine reminder sent", "No open tasks"],
    },
    {
        "demo_id": "DEMO-002",
        "name": "Ramesh Kumar (synthetic)",
        "days_since_last_contact": 41,
        "missed_appointments_90d": 2,
        "open_follow_up_tasks": 2,
        "days_in_current_stage": 18,
        "previous_escalations": 1,
        "history": ["Last contact 41 days ago", "Two missed visits recorded", "Two open scheduling tasks"],
    },
    {
        "demo_id": "DEMO-003",
        "name": "Sunita Bai (synthetic)",
        "days_since_last_contact": 68,
        "missed_appointments_90d": 3,
        "open_follow_up_tasks": 3,
        "days_in_current_stage": 35,
        "previous_escalations": 2,
        "history": ["Long gap since contact", "Three missed visits", "Multiple open coordination tasks"],
    },
    {
        "demo_id": "DEMO-004",
        "name": "Imran Sheikh (synthetic)",
        "days_since_last_contact": 19,
        "missed_appointments_90d": 0,
        "open_follow_up_tasks": 1,
        "days_in_current_stage": 9,
        "previous_escalations": 0,
        "history": ["Recent contact logged", "One open scheduling task"],
    },
    {
        "demo_id": "DEMO-005",
        "name": "Lakshmi N. (synthetic)",
        "days_since_last_contact": 33,
        "missed_appointments_90d": 1,
        "open_follow_up_tasks": 2,
        "days_in_current_stage": 22,
        "previous_escalations": 1,
        "history": ["One missed visit", "Two open follow-ups", "Previous escalation noted"],
    },
    {
        "demo_id": "DEMO-006",
        "name": "Vijay Patil (synthetic)",
        "days_since_last_contact": 12,
        "missed_appointments_90d": 2,
        "open_follow_up_tasks": 0,
        "days_in_current_stage": 6,
        "previous_escalations": 0,
        "history": ["Recent contact", "Two historical missed visits", "No open tasks currently"],
    },
    {
        "demo_id": "DEMO-007",
        "name": "Fatima Begum (synthetic)",
        "days_since_last_contact": 55,
        "missed_appointments_90d": 1,
        "open_follow_up_tasks": 4,
        "days_in_current_stage": 28,
        "previous_escalations": 1,
        "history": ["Longer contact gap", "Four open coordination tasks", "One prior escalation"],
    },
    {
        "demo_id": "DEMO-008",
        "name": "Suresh Yadav (synthetic)",
        "days_since_last_contact": 4,
        "missed_appointments_90d": 0,
        "open_follow_up_tasks": 1,
        "days_in_current_stage": 3,
        "previous_escalations": 0,
        "history": ["Very recent contact", "One light scheduling task"],
    },
]

NOTICE = (
    "All cases, training data and targets are 100% synthetic. "
    "This model is an operational coordination demonstration only. "
    "It does not predict disease, pregnancy risk, clinical outcomes or patient safety. "
    "Never enter real patient data."
)


# ---------------------------------------------------------------------------
# API Models
# ---------------------------------------------------------------------------
class PredictionInput(BaseModel):
    days_since_last_contact: int = Field(ge=0, le=90, default=30)
    missed_appointments_90d: int = Field(ge=0, le=5, default=1)
    open_follow_up_tasks: int = Field(ge=0, le=5, default=1)
    days_in_current_stage: int = Field(ge=0, le=60, default=10)
    previous_escalations: int = Field(ge=0, le=3, default=0)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.get("/demo-patients")
def get_demo_patients():
    patients = []
    for case in DEMO_CASES:
        feats = {k: case[k] for k in FEATURE_NAMES}
        pred = predict_full(feats)
        patients.append({
            "demo_id": case["demo_id"],
            "name": case["name"],
            "features": feats,
            "history": case["history"],
            "prediction": pred,
        })
    return {
        "title": "Synthetic Care-Coordination AI Insights",
        "model": MODEL_NAME,
        "using_sklearn": USE_SKLEARN,
        "features": FEATURE_NAMES,
        "feature_labels": FEATURE_LABELS,
        "feature_importance": SKLEARN_IMPORTANCE if USE_SKLEARN else PURE_MODEL.feature_importance,
        "training_examples": 1600 if USE_SKLEARN else 1200,
        "classes": ["routine coordination", "scheduling check-in recommended", "higher coordination priority"],
        "notice": NOTICE,
        "patients": patients,
    }


@router.post("/predict")
def predict_coordination(payload: PredictionInput):
    feats = payload.model_dump()
    return predict_full(feats)


@router.get("/model-info")
def model_info():
    return {
        "model": MODEL_NAME,
        "using_sklearn": USE_SKLEARN,
        "features": FEATURE_NAMES,
        "feature_labels": FEATURE_LABELS,
        "feature_importance": SKLEARN_IMPORTANCE if USE_SKLEARN else PURE_MODEL.feature_importance,
        "notice": NOTICE,
        "description": (
            "Operational coordination-load model trained on fully synthetic examples. "
            "Designed for explainability and demo safety."
        ),
    }
