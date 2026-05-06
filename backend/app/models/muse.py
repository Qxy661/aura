from sqlalchemy import Column, Integer, String, Text, DateTime, Date
from sqlalchemy.sql import func
from app.database import Base


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)  # 金句内容
    author = Column(String(200), default="")  # 出处/作者
    source_url = Column(String(1000), default="")
    shown_date = Column(Date, nullable=True)  # 展示日期
    created_at = Column(DateTime, server_default=func.now())
    book_title = Column(String(300), default="")  # 书名
    ai_summary = Column(Text, default="")  # AI 一句话总结
    ai_analysis = Column(Text, default="")  # AI 深度分析


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)  # 闪念笔记内容
    quote_id = Column(Integer, nullable=True)  # 关联的金句 ID（可选）
    mood = Column(String(50), default="neutral")  # 心情标签
    tags = Column(String(500), default="")  # 逗号分隔的标签
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class MoodRecord(Base):
    __tablename__ = "mood_records"

    id = Column(Integer, primary_key=True, index=True)
    mood = Column(String(50), nullable=False)  # happy, sad, calm, anxious, inspired
    intensity = Column(Integer, default=3)  # 1-5 scale
    date = Column(Date, nullable=False)
    note = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
