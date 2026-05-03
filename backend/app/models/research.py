from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class ResearchField(Base):
    __tablename__ = "research_fields"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    name_en = Column(String(100), default="")
    keywords = Column(Text, nullable=False)
    icon = Column(String(10), default="")
    is_active = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    url = Column(String(1000), unique=True, nullable=False)
    source = Column(String(100), nullable=False)  # "arxiv" or "rss"
    authors = Column(String(500), default="")
    abstract = Column(Text, default="")
    summary = Column(Text, default="")  # AI 一句话总结
    key_points = Column(Text, default="")  # AI 核心贡献点 (JSON array string)
    relevance_score = Column(Float, default=0.0)  # AI 相关性打分 0-10
    user_relevance_score = Column(Float, default=0.0)  # 个人相关性评分 0-10
    paper_chat_history = Column(Text, default="")  # 论文对话历史 JSON
    full_text = Column(Text, default="")  # PDF 全文提取
    is_saved = Column(Boolean, default=False)  # 收藏标记
    tags = Column(String(500), default="")  # 逗号分隔的标签
    folder = Column(String(200), default="")  # 文件夹分类
    notes = Column(Text, default="")  # 用户 Markdown 笔记
    published_at = Column(DateTime, nullable=True)
    fetched_at = Column(DateTime, server_default=func.now())


class PaperRelation(Base):
    __tablename__ = "paper_relations"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    target_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    relation_type = Column(String(50), default="keyword")  # keyword / author / topic
    strength = Column(Float, default=0.0)  # 0.0 - 1.0
