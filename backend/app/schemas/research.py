from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ArticleOut(BaseModel):
    id: int
    title: str
    url: str
    source: str
    authors: str
    abstract: str
    summary: str
    key_points: str
    relevance_score: float
    is_saved: bool
    tags: str
    folder: str
    notes: str
    published_at: Optional[datetime]
    fetched_at: datetime

    class Config:
        from_attributes = True


class ArticleUpdate(BaseModel):
    is_saved: Optional[bool] = None
    tags: Optional[str] = None
    folder: Optional[str] = None
    notes: Optional[str] = None


class ArticleListOut(BaseModel):
    articles: list[ArticleOut]
    total: int


class ResearchFieldOut(BaseModel):
    id: int
    name: str
    name_en: str
    keywords: str
    icon: str
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class ResearchFieldUpdate(BaseModel):
    is_active: bool
