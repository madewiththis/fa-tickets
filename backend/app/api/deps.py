from typing import Generator
from app.db.session import get_db
from sqlalchemy.orm import Session
from fastapi import Header, HTTPException
from app.core.config import settings


def db_session() -> Generator[Session, None, None]:
    yield from get_db()


def require_auth(x_auth_token: str | None = Header(default=None)) -> None:
    """Simple shared-token auth. If settings.auth_token is set, require header X-Auth-Token to match."""
    if settings.auth_token:
        if not x_auth_token or x_auth_token != settings.auth_token:
            raise HTTPException(status_code=401, detail="Unauthorized")
