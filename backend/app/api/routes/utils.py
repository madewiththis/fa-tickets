from fastapi import APIRouter, Depends, HTTPException, Response, Query
from pydantic import EmailStr
from datetime import datetime, timezone, timedelta
import os
from app.integrations.email.service import send_and_log
from app.integrations.email.registry import code_for
from app.integrations.email.renderer import render
from app.api.deps import require_auth
import segno
import io
from sqlalchemy.orm import Session
from app.api.deps import db_session

router = APIRouter(tags=["utils"])


@router.get("/qr")
def qr(data: str = Query(min_length=1, max_length=256), scale: int = 4, format: str = Query("svg", pattern="^(svg|png)$")):
    try:
        q = segno.make(data, error='m')
        buf = io.BytesIO()
        kind = 'png' if format == 'png' else 'svg'
        q.save(buf, kind=kind, scale=scale)
        if kind == 'svg':
            svg = buf.getvalue().decode('utf-8')
            return Response(content=svg, media_type="image/svg+xml")
        else:
            png = buf.getvalue()
            return Response(content=png, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/test_email")
def test_email(to: EmailStr = Query(..., description="Recipient email address"), db: Session = Depends(db_session)):
    try:
        app_origin = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
        now_str = datetime.now(timezone.utc).isoformat()
        template_code = code_for('test_email')
        subject, text, html = render(template_code, { 'now': now_str, 'app_origin': app_origin })
        ok = send_and_log(to_email=str(to), subject=subject, text=text, html=html, template_name='test_email', context={'test': True}, db=db, related=None)
        if not ok:
            raise HTTPException(status_code=500, detail="Email send reported failure")
        return {"sent": True, "to": str(to)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
