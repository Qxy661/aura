from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
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


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    holding_id = Column(Integer, ForeignKey("holdings.id"), nullable=False)
    tx_type = Column(String(10), nullable=False)  # "buy" or "sell"
    price = Column(Float, nullable=False)  # 交易价格
    shares = Column(Float, nullable=False)  # 交易份额
    amount = Column(Float, nullable=False)  # 交易金额
    note = Column(Text, default="")  # 备注
    tx_date = Column(DateTime, nullable=False)  # 交易日期
    created_at = Column(DateTime, server_default=func.now())


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    holding_id = Column(Integer, ForeignKey("holdings.id"), nullable=False)
    price = Column(Float, nullable=False)
    recorded_at = Column(DateTime, server_default=func.now())


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


class SectorFlowSnapshot(Base):
    """每日收盘板块资金流向快照"""
    __tablename__ = "sector_flow_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    sector_type = Column(String(20), nullable=False)  # industry / concept
    sector_code = Column(String(20), nullable=False)
    sector_name = Column(String(100), nullable=False)
    change_pct = Column(Float, default=0)
    main_net_inflow = Column(Float, default=0)  # 主力净流入(元)
    main_net_inflow_pct = Column(Float, default=0)
    super_large_net_inflow = Column(Float, default=0)
    large_net_inflow = Column(Float, default=0)
    medium_net_inflow = Column(Float, default=0)
    small_net_inflow = Column(Float, default=0)
    recorded_at = Column(DateTime, server_default=func.now())


class WatchlistItem(Base):
    """关注列表 — 用户想跟踪但尚未买入的标的"""
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=False)
    asset_type = Column(String(50), default="fund")
    target_price = Column(Float, nullable=True)   # 目标买入价
    note = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())


class PriceAlert(Base):
    """价格提醒 — 当持仓价格达到目标时提醒用户"""
    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, index=True)
    holding_id = Column(Integer, ForeignKey("holdings.id"), nullable=False)
    alert_type = Column(String(20), nullable=False)  # "above" / "below"
    target_price = Column(Float, nullable=False)
    is_active = Column(Integer, default=1)  # 1=active, 0=triggered/disabled
    triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class DailyMarketSummary(Base):
    """每日收盘AI总结"""
    __tablename__ = "daily_market_summaries"

    id = Column(Integer, primary_key=True, index=True)
    summary_date = Column(String(10), nullable=False, unique=True, index=True)  # YYYY-MM-DD
    summary_content = Column(Text, nullable=False)  # AI生成的总结
    net_inflow_count = Column(Integer, default=0)
    net_outflow_count = Column(Integer, default=0)
    total_net_flow = Column(Float, default=0)  # 全市场净流入(元)
    top_inflow_sectors = Column(Text, default="")  # JSON: top流入板块
    top_outflow_sectors = Column(Text, default="")  # JSON: top流出板块
    created_at = Column(DateTime, server_default=func.now())
