from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter
from fastapi.middleware.cors import CORSMiddleware
import logging

from alembic import command as alembic_command
from alembic.config import Config as AlembicConfig
from sqlalchemy import text
from app.db.session import engine

from app.api.routes.events import router as events_router
from app.api.routes.tickets import router as tickets_router
from app.api.routes.checkin import router as checkin_router
from app.api.routes.reports import router as reports_router
from app.api.routes.content import router as content_router
from app.api.routes.admin import router as admin_router
from app.api.deps import require_auth
from app.api.routes.utils import router as utils_router
from app.api.routes.purchases import router as purchases_router
from app.api.routes.contacts import router as contacts_router

app = FastAPI(title="FlowEvents")

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
api.include_router(purchases_router)
api.include_router(contacts_router)
api.include_router(checkin_router)
api.include_router(reports_router)
api.include_router(content_router)
api.include_router(utils_router)
api.include_router(admin_router)

app.include_router(api)


def is_database_fresh() -> bool:
    """Check if database is fresh (no alembic_version table or empty)."""
    try:
        with engine.connect() as conn:
            # Check if alembic_version table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'alembic_version'
                );
            """))
            table_exists = result.scalar()

            if not table_exists:
                return True

            # Check if table has any rows
            result = conn.execute(
                text("SELECT COUNT(*) FROM alembic_version")
            )
            count = result.scalar()
            return count == 0
    except Exception:
        # If we can't check, assume fresh (will fail gracefully if not)
        return True


@app.on_event("startup")
def run_migrations_on_startup() -> None:
    """Auto-apply Alembic migrations on container startup.

    For fresh databases, uses the consolidated migration (20250101_0001).
    For existing databases, runs sequential migrations to head.
    """
    import os
    logger = logging.getLogger(__name__)

    # Consolidated migration revision for fresh deployments
    CONSOLIDATED_REVISION = "20250101_0001"

    try:
        # Ensure we're in the right directory (alembic.ini should be in /app)
        alembic_ini_path = os.path.join(os.getcwd(), "alembic.ini")
        if not os.path.exists(alembic_ini_path):
            # Try alternative path
            alembic_ini_path = "/app/alembic.ini"

        cfg = AlembicConfig(alembic_ini_path)
        # Override script location to be relative to alembic.ini location
        script_dir = os.path.dirname(alembic_ini_path)
        script_location = os.path.join(script_dir, "app/db/migrations")
        if os.path.exists(script_location):
            cfg.set_main_option("script_location", script_location)

        # Check if database is fresh
        if is_database_fresh():
            logger.info(
                "Fresh database detected - using consolidated migration"
            )
            logger.info(
                f"Running consolidated migration: {CONSOLIDATED_REVISION}"
            )
            alembic_command.upgrade(cfg, CONSOLIDATED_REVISION)
            logger.info(
                f"Consolidated migration applied: {CONSOLIDATED_REVISION}"
            )
        else:
            logger.info(
                "Existing database - running sequential migrations to head"
            )
            alembic_command.upgrade(cfg, "head")
            logger.info("Sequential migrations applied successfully")
    except Exception as exc:
        logger.error(f"Alembic migration failed: {exc}", exc_info=True)
        # Don't crash the app, but log the error prominently
        raise
