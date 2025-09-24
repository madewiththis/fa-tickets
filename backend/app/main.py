from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter
from fastapi.middleware.cors import CORSMiddleware
import logging

from alembic import command as alembic_command
from alembic.config import Config as AlembicConfig

from app.api.routes.events import router as events_router
from app.api.routes.tickets import router as tickets_router
from app.api.routes.checkin import router as checkin_router
from app.api.routes.reports import router as reports_router
from app.api.routes.content import router as content_router
from app.api.deps import require_auth
from app.api.routes.utils import router as utils_router

app = FastAPI(title="FA Tickets MVP")

# CORS for frontend dev
app.add_middleware(
    CORSMiddleware,
    # Dev: allow all origins to avoid CORS blockers during local testing
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})


@app.get("/")
def root() -> JSONResponse:
    return JSONResponse({"name": "fa-tickets", "version": 1})


api = APIRouter(dependencies=[Depends(require_auth)])
api.include_router(events_router)
api.include_router(tickets_router)
api.include_router(checkin_router)
api.include_router(reports_router)
api.include_router(content_router)
api.include_router(utils_router)

app.include_router(api)


@app.on_event("startup")
def run_migrations_on_startup() -> None:
    """Auto-apply Alembic migrations on container startup (dev convenience)."""
    try:
        cfg = AlembicConfig("alembic.ini")
        alembic_command.upgrade(cfg, "head")
        logging.getLogger(__name__).info("Alembic migrations applied (upgrade head)")
    except Exception as exc:
        logging.getLogger(__name__).warning("Alembic migration failed: %s", exc)
