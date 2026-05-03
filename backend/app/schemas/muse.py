from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class QuoteCreate(BaseModel):
    content: str
    author: str = ""
    book_title: str = ""


class QuoteOut(BaseModel):
    id: int
    content: str
    author: str
    source_url: str
    shown_date: Optional[date]
    created_at: datetime
    book_title: str = ""
    ai_summary: str = ""
    ai_analysis: str = ""

    class Config:
        from_attributes = True


class NoteCreate(BaseModel):
    content: str
    quote_id: Optional[int] = None
    mood: str = "neutral"


class NoteOut(BaseModel):
    id: int
    content: str
    quote_id: Optional[int]
    mood: str
    created_at: datetime

    class Config:
        from_attributes = True


class MoodRecordCreate(BaseModel):
    mood: str
    note: str = ""


class MoodRecordOut(BaseModel):
    id: int
    mood: str
    date: date
    note: str
    created_at: datetime

    class Config:
        from_attributes = True


class TarotCard(BaseModel):
    name: str
    meaning: str
    image_url: str
    is_reversed: bool
