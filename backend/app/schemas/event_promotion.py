from pydantic import BaseModel, Field


class EventPromotionRead(BaseModel):
    event_id: int
    description: str | None = Field(default=None)
    speakers: str | None = Field(default=None)
    audience: str | None = Field(default=None)


class EventPromotionUpsert(BaseModel):
    description: str | None = Field(default=None)
    speakers: str | None = Field(default=None)
    audience: str | None = Field(default=None)

