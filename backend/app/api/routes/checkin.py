from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.schemas.checkin import CheckinRequest, CheckinResponse
from app.services.checkin import check_in_by_code

router = APIRouter(tags=["checkin"])


@router.post("/checkin", response_model=CheckinResponse)
def checkin(req: CheckinRequest, db: Session = Depends(db_session)):
    try:
        t = check_in_by_code(db, event_id=req.event_id, code=req.code)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return CheckinResponse(
        ticket_id=t.id,
        event_id=t.event_id,
        short_code=t.short_code or "",
        previous_status=getattr(t, "previous_status", "unknown"),
        new_status=t.status,
        checked_in_at=t.checked_in_at,
    )

