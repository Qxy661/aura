from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)  # 基金/股票名称
    code = Column(String(50), nullable=False)  # 代码
    asset_type = Column(String(50), default="fund")  # fund / stock / crypto
    cost_price = Column(Float, nullable=False)  # 成本价
    shares = Column(Float, nullable=False)  # 份额
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)  # 碎片化观点内容
    source = Column(String(200), default="")  # 来源（小红书、雪球等）
    tags = Column(String(500), default="")
    created_at = Column(DateTime, server_default=func.now())


class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_content = Column(Text, nullable=False)  # AI 生成的复盘报告
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
