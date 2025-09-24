from fastapi import APIRouter, Depends, HTTPException, Response, Query
from pydantic import EmailStr
from datetime import datetime, timezone
import os
from app.integrations.email.service import send_code_email
from app.api.deps import require_auth
import segno
import io

router = APIRouter(tags=["utils"])


@router.get("/qr")
def qr(data: str = Query(min_length=1, max_length=256), scale: int = 4):
    try:
        q = segno.make(data, error='m')
        buf = io.BytesIO()
        q.save(buf, kind='svg', scale=scale)
        svg = buf.getvalue().decode('utf-8')
        return Response(content=svg, media_type="image/svg+xml")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/test_email")
def test_email(to: EmailStr = Query(..., description="Recipient email address")):
    try:
        now = datetime.now(timezone.utc).isoformat()
        app_origin = os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:5173")
        # Simple mock code and link (token-only flow)
        code = "000"
        payment_link = f"{app_origin}/#pay?token=DEMO-TOKEN-000"
        ok = send_code_email(
            to_email=str(to),
            event_title="Test Email",
            event_when=now,
            code=code,
            payment_link=payment_link,
        )
        if not ok:
            raise HTTPException(status_code=500, detail="Email send reported failure")
        return {"sent": True, "to": str(to)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
