from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import create_tables
from backend.routes.maternal import router as maternal_router
from backend.routes.health_metrics import router as health_router

create_tables()

app = FastAPI(
    title="SwasthyaSetu AI",
    description="Healthcare Support Application",
    version="1.0.0"
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

@app.get("/")
def home():
    return {"message": "SwasthyaSetu AI Backend is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
