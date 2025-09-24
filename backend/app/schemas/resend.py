from pydantic import BaseModel


class ResendRequest(BaseModel):
    ticket_id: int


class ResendResponse(BaseModel):
    ticket_id: int
    resent: bool

