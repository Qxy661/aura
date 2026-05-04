from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class SmartTodo(Base):
    __tablename__ = "smart_todos"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)           # Original user input
    parsed_title = Column(Text, default="")           # LLM-parsed title
    parsed_deadline = Column(Text, default="")        # ISO date or empty
    parsed_priority = Column(Integer, default=2)      # 1=high, 2=medium, 3=low
    category = Column(String(50), default="general")  # research/wealth/general
    is_done = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)


class DailyBrief(Base):
    __tablename__ = "daily_briefs"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), unique=True, nullable=False)  # "2026-05-04"
    content = Column(Text, default="")
    article_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
