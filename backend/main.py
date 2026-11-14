from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import create_tables
from backend.routes.maternal import router as maternal_router
from backend.routes.health_metrics import router as health_router
from backend.routes.ai_insights import router as insights_router
from backend.routes.patient_journey import router as journey_router
from backend.routes.auth import router as auth_router
from backend.routes.admin import router as admin_router
from backend.routes.assistant import router as assistant_router

create_tables()

app = FastAPI(
    title="SwasthyaSetu AI",
    description="Healthcare coordination prototype with explainable AI insights and LLM-ready assistant",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(maternal_router)
app.include_router(health_router)
app.include_router(insights_router)
app.include_router(journey_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(assistant_router)

@app.get("/")
def home():
    return {
        "message": "SwasthyaSetu AI Backend is running!",
        "version": "2.0.0",
        "features": ["explainable-ml", "llm-ready-assistant", "rbac", "admin-panel-2.0"]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
