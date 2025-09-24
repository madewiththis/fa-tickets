from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.services.reports import reconciliation_summary, reconciliation_csv

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/reconciliation")
def reconciliation(event_id: int, db: Session = Depends(db_session)):
    try:
        summary = reconciliation_summary(db, event_id=event_id)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/reconciliation.csv")
def reconciliation_csv_export(event_id: int, db: Session = Depends(db_session)):
    try:
        summary = reconciliation_summary(db, event_id=event_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    csv_text = reconciliation_csv(summary)
    return Response(content=csv_text, media_type="text/csv")

