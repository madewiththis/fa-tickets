from datetime import datetime
from pydantic import BaseModel, Field


class CheckinRequest(BaseModel):
    event_id: int
    code: str = Field(min_length=3, max_length=3)


class CheckinResponse(BaseModel):
    ticket_id: int
    event_id: int
    short_code: str
    previous_status: str
    new_status: str
    checked_in_at: datetime

