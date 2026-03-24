import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from services.db_service import init_db
from routers import projects, ideation, clearance, drafting, audit, settings, research, analysis, pipeline, auth, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Automotive IP Strategy Firm API",
    description="AI-powered patent strategy platform for automotive R&D professionals",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://frontend-kappa-two-59.vercel.app",
        "https://patent-lawyer-backend-production.up.railway.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(ideation.router)
app.include_router(clearance.router)
app.include_router(drafting.router)
app.include_router(audit.router)
app.include_router(settings.router)
app.include_router(research.router)
app.include_router(analysis.router)
app.include_router(pipeline.router)
app.include_router(auth.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    from services.llm_service import MOCK_MODE
    return {
        "message": "Automotive IP Strategy Firm API",
        "version": "1.0.0",
        "mode": "mock" if MOCK_MODE else "production",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
