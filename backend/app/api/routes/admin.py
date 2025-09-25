from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.db.models.email_log import EmailLog
from app.schemas.email_log import EmailLogRead


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/email_logs", response_model=list[EmailLogRead])
def list_email_logs(
    db: Session = Depends(db_session),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    rows = (
        db.query(EmailLog)
        .order_by(EmailLog.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    # Include text_body for preview; omit html_body for size/perf
    return rows

