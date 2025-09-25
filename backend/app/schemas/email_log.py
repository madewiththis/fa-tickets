from datetime import datetime
from pydantic import BaseModel


class EmailLogRead(BaseModel):
    id: int
    to_email: str
    subject: str
    template_name: str
    status: str
    created_at: datetime
    event_id: int | None = None
    ticket_id: int | None = None
    purchase_id: int | None = None
    context: dict | None = None
    text_body: str | None = None

    class Config:
        from_attributes = True
