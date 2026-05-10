from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app.models.wealth import Holding, Insight, WeeklyReport, PriceHistory, Transaction, SectorFlowSnapshot, DailyMarketSummary, WatchlistItem, PriceAlert
from app.schemas.wealth import (
    HoldingCreate, HoldingUpdate, HoldingOut,
    InsightCreate, InsightOut,
    ReportOut,
)

router = APIRouter(prefix="/api/wealth", tags=["wealth"])


# --- Holdings ---
@router.get("/holdings", response_model=list[HoldingOut])
def list_holdings(
    sort_by: str = "created_at",
    order: str = "desc",
    asset_type: str = None,
    db: Session = Depends(get_db),
):
    query = db.query(Holding)
    if asset_type:
        query = query.filter(Holding.asset_type == asset_type)

    sort_column = getattr(Holding, sort_by, Holding.created_at)
    if order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    return query.all()


@router.get("/search")
def search_holdings(q: str = "", limit: int = 10):
    """Search funds/stocks by name or code."""
    from app.services.market_service import search_funds
    if not q or len(q) < 2:
        return {"results": []}
    results = search_funds(q, limit)
    return {"results": results}


@router.post("/holdings", response_model=HoldingOut)
def create_holding(data: HoldingCreate, db: Session = Depends(get_db)):
    holding = Holding(**data.model_dump())
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return holding


@router.patch("/holdings/{holding_id}", response_model=HoldingOut)
def update_holding(holding_id: int, data: HoldingUpdate, db: Session = Depends(get_db)):
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(holding, field, value)
    db.commit()
    db.refresh(holding)
    return holding


@router.delete("/holdings/{holding_id}")
def delete_holding(holding_id: int, db: Session = Depends(get_db)):
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    db.delete(holding)
    db.commit()
    return {"ok": True}


# --- Insights ---
@router.get("/insights", response_model=list[InsightOut])
def list_insights(db: Session = Depends(get_db)):
    return db.query(Insight).order_by(Insight.created_at.desc()).all()


@router.post("/insights", response_model=InsightOut)
def create_insight(data: InsightCreate, db: Session = Depends(get_db)):
    insight = Insight(**data.model_dump())
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return insight


@router.delete("/insights/{insight_id}")
def delete_insight(insight_id: int, db: Session = Depends(get_db)):
    insight = db.query(Insight).filter(Insight.id == insight_id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    db.delete(insight)
    db.commit()
    return {"ok": True}


# --- Market Data ---
@router.get("/holdings/{holding_id}/market")
def get_holding_market(holding_id: int, db: Session = Depends(get_db)):
    """Get real-time market data for a specific holding."""
    from app.services.market_service import fetch_holding_price

    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    market = fetch_holding_price(holding.code, holding.asset_type)
    if not market:
        return {"holding_id": holding_id, "error": "无法获取行情数据"}

    current_price = market.get("current_price", 0)
    cost_value = holding.cost_price * holding.shares
    market_value = current_price * holding.shares if current_price > 0 else 0
    profit = market_value - cost_value if current_price > 0 else 0
    profit_pct = (profit / cost_value * 100) if cost_value > 0 else 0

    return {
        "holding_id": holding_id,
        "name": market.get("name", holding.name),
        "code": holding.code,
        "asset_type": holding.asset_type,
        "cost_price": holding.cost_price,
        "shares": holding.shares,
        "current_price": current_price,
        "market_value": round(market_value, 2),
        "cost_value": round(cost_value, 2),
        "profit": round(profit, 2),
        "profit_pct": round(profit_pct, 2),
        "change_pct": market.get("change_pct", market.get("estimated_change_pct", 0)),
        "date": market.get("date", ""),
    }


@router.get("/portfolio")
def get_portfolio(db: Session = Depends(get_db)):
    """Get portfolio overview with real-time P&L for all holdings."""
    from app.services.market_service import fetch_holding_price

    holdings = db.query(Holding).all()
    if not holdings:
        return {"holdings": [], "total_cost": 0, "total_market": 0, "total_profit": 0, "total_profit_pct": 0}

    results = []
    total_cost = 0
    total_market = 0

    for h in holdings:
        market = fetch_holding_price(h.code, h.asset_type)
        current_price = market.get("current_price", 0) if market else 0
        cost_value = h.cost_price * h.shares
        market_value = current_price * h.shares if current_price > 0 else 0
        profit = market_value - cost_value if current_price > 0 else 0
        profit_pct = (profit / cost_value * 100) if cost_value > 0 else 0

        total_cost += cost_value
        total_market += market_value

        change_pct = market.get("change_pct", market.get("estimated_change_pct", 0)) if market else 0
        daily_pnl = round(market_value * change_pct / 100, 2) if market_value > 0 else 0

        results.append({
            "id": h.id,
            "name": market.get("name", h.name) if market else h.name,
            "code": h.code,
            "asset_type": h.asset_type,
            "cost_price": h.cost_price,
            "shares": h.shares,
            "current_price": current_price,
            "market_value": round(market_value, 2),
            "cost_value": round(cost_value, 2),
            "profit": round(profit, 2),
            "profit_pct": round(profit_pct, 2),
            "change_pct": change_pct,
            "daily_pnl": daily_pnl,
        })

    total_profit = total_market - total_cost
    total_profit_pct = (total_profit / total_cost * 100) if total_cost > 0 else 0

    # Record price snapshots (once per day per holding)
    from datetime import date
    today = date.today().isoformat()
    for h, r in zip(holdings, results):
        if r["current_price"] > 0:
            existing = db.query(PriceHistory).filter(
                PriceHistory.holding_id == h.id,
                func.date(PriceHistory.recorded_at) == today,
            ).first()
            if not existing:
                db.add(PriceHistory(holding_id=h.id, price=r["current_price"]))
    try:
        db.commit()
    except Exception:
        db.rollback()

    return {
        "holdings": results,
        "total_cost": round(total_cost, 2),
        "total_market": round(total_market, 2),
        "total_profit": round(total_profit, 2),
        "total_profit_pct": round(total_profit_pct, 2),
    }


# --- Weekly Report ---
@router.post("/reports/generate", response_model=ReportOut)
def generate_report(db: Session = Depends(get_db)):
    """Generate AI weekly investment review report."""
    from app.services.llm_service import generate_investment_report

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    holdings = db.query(Holding).all()
    insights = db.query(Insight).filter(Insight.created_at >= week_ago).all()

    if not holdings:
        raise HTTPException(status_code=400, detail="No holdings to analyze")

    try:
        report_text = generate_investment_report(holdings, insights)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

    report = WeeklyReport(
        report_content=report_text,
        period_start=week_ago,
        period_end=now,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/reports", response_model=list[ReportOut])
def list_reports(db: Session = Depends(get_db)):
    return db.query(WeeklyReport).order_by(WeeklyReport.created_at.desc()).all()


# --- OCR Holdings ---
@router.post("/holdings/ocr")
async def ocr_holdings(file: UploadFile = File(...)):
    """Accept a fund screenshot, extract holdings via LLM vision."""
    from app.services.llm_service import extract_holdings_from_image

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="图片过大（最大 10MB）")

    media_type = file.content_type or "image/png"
    if media_type not in ("image/png", "image/jpeg", "image/webp", "image/gif"):
        raise HTTPException(status_code=400, detail="不支持的图片格式")

    try:
        holdings_data = extract_holdings_from_image(image_bytes, media_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR 识别失败: {str(e)}")

    return {"holdings": holdings_data}


@router.post("/holdings/parse-text")
def parse_holdings_text(text: str = Body(..., embed=True)):
    """Parse fund holdings from user-pasted text via LLM."""
    from app.services.llm_service import parse_holdings_from_text

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="请输入持仓文字信息")

    try:
        holdings_data = parse_holdings_from_text(text.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析失败: {str(e)}")

    return {"holdings": holdings_data}


# --- Price History ---
@router.get("/holdings/{holding_id}/history")
def get_price_history(holding_id: int, days: int = 30, db: Session = Depends(get_db)):
    """Get price history for a holding."""
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)
    history = db.query(PriceHistory).filter(
        PriceHistory.holding_id == holding_id,
        PriceHistory.recorded_at >= cutoff,
    ).order_by(PriceHistory.recorded_at).all()

    return {
        "holding_id": holding_id,
        "cost_price": holding.cost_price,
        "history": [
            {"price": h.price, "recorded_at": h.recorded_at.isoformat()}
            for h in history
        ],
    }


@router.get("/allocation")
def get_allocation(db: Session = Depends(get_db)):
    """Get portfolio allocation data for pie chart."""
    from app.services.market_service import fetch_holding_price

    holdings = db.query(Holding).all()
    if not holdings:
        return {"items": []}

    items = []
    for h in holdings:
        market = fetch_holding_price(h.code, h.asset_type)
        current_price = market.get("current_price", 0) if market else 0
        market_value = current_price * h.shares if current_price > 0 else h.cost_price * h.shares
        items.append({
            "id": h.id,
            "name": h.name,
            "code": h.code,
            "asset_type": h.asset_type,
            "market_value": round(market_value, 2),
        })

    total = sum(i["market_value"] for i in items)
    for item in items:
        item["pct"] = round(item["market_value"] / total * 100, 1) if total > 0 else 0

    items.sort(key=lambda x: x["market_value"], reverse=True)
    return {"items": items, "total": round(total, 2)}


# --- Rebalance Suggestions ---
@router.post("/rebalance")
def generate_rebalance(db: Session = Depends(get_db)):
    """Generate AI rebalancing suggestions based on current portfolio."""
    from app.services.llm_service import generate_rebalance_suggestions
    from app.services.market_service import fetch_holding_price

    holdings = db.query(Holding).all()
    if not holdings:
        raise HTTPException(status_code=400, detail="No holdings to analyze")

    # Build allocation data
    items = []
    for h in holdings:
        market = fetch_holding_price(h.code, h.asset_type)
        current_price = market.get("current_price", 0) if market else 0
        market_value = current_price * h.shares if current_price > 0 else h.cost_price * h.shares
        cost_value = h.cost_price * h.shares
        profit = market_value - cost_value
        profit_pct = (profit / cost_value * 100) if cost_value > 0 else 0
        items.append({
            "name": h.name,
            "code": h.code,
            "market_value": round(market_value, 2),
            "profit_pct": round(profit_pct, 2),
        })

    total = sum(i["market_value"] for i in items)
    for item in items:
        item["pct"] = round(item["market_value"] / total * 100, 1) if total > 0 else 0

    allocation = {"items": items, "total": round(total, 2)}

    try:
        suggestions = generate_rebalance_suggestions(items, allocation)
        return {"suggestions": suggestions, "total": round(total, 2)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rebalance failed: {str(e)}")


# --- Behavior Analysis ---
@router.post("/behavior-analysis")
def generate_behavior(db: Session = Depends(get_db)):
    """Analyze investment behavior patterns."""
    from app.services.llm_service import generate_behavior_analysis
    from app.services.market_service import fetch_holding_price
    # Use wealth Insight (market observations), not muse Insight

    holdings = db.query(Holding).all()
    if not holdings:
        raise HTTPException(status_code=400, detail="No holdings to analyze")

    holding_data = [
        {
            "name": h.name,
            "code": h.code,
            "cost_price": h.cost_price,
            "shares": h.shares,
            "asset_type": h.asset_type,
            "created_at": str(h.created_at) if h.created_at else "",
        }
        for h in holdings
    ]

    # Gather price history for each holding
    price_history = {}
    for h in holdings:
        from app.models.wealth import PriceHistory
        history = (
            db.query(PriceHistory)
            .filter(PriceHistory.holding_id == h.id)
            .order_by(PriceHistory.recorded_at.asc())
            .all()
        )
        price_history[h.code] = [
            {"price": p.price, "date": str(p.recorded_at)}
            for p in history
        ]

    insights = db.query(Insight).order_by(Insight.created_at.desc()).limit(10).all()
    insight_data = [
        {"content": i.content, "source": i.source or ""}
        for i in insights
    ]

    try:
        analysis = generate_behavior_analysis(holding_data, price_history, insight_data)
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# --- Transactions ---
@router.get("/holdings/{holding_id}/transactions")
def list_transactions(holding_id: int, db: Session = Depends(get_db)):
    """List transactions for a holding."""
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    txs = (
        db.query(Transaction)
        .filter(Transaction.holding_id == holding_id)
        .order_by(Transaction.tx_date.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "holding_id": t.holding_id,
            "tx_type": t.tx_type,
            "price": t.price,
            "shares": t.shares,
            "amount": t.amount,
            "note": t.note or "",
            "tx_date": str(t.tx_date) if t.tx_date else "",
            "created_at": str(t.created_at) if t.created_at else "",
        }
        for t in txs
    ]


@router.post("/holdings/{holding_id}/transactions")
def create_transaction(
    holding_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
):
    """Record a buy/sell transaction."""
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    tx_type = data.get("tx_type", "buy")
    price = float(data.get("price", 0))
    shares = float(data.get("shares", 0))
    note = data.get("note", "")
    tx_date_str = data.get("tx_date", "")

    if price <= 0 or shares <= 0:
        raise HTTPException(status_code=400, detail="Price and shares must be positive")

    tx_date = datetime.utcnow()
    if tx_date_str:
        try:
            tx_date = datetime.fromisoformat(tx_date_str)
        except (ValueError, TypeError):
            pass

    amount = price * shares
    tx = Transaction(
        holding_id=holding_id,
        tx_type=tx_type,
        price=price,
        shares=shares,
        amount=amount,
        note=note,
        tx_date=tx_date,
    )
    db.add(tx)

    # Update holding cost_price and shares based on transaction
    if tx_type == "buy":
        total_cost = holding.cost_price * holding.shares + amount
        holding.shares += shares
        holding.cost_price = total_cost / holding.shares if holding.shares > 0 else price
    elif tx_type == "sell":
        holding.shares = max(0, holding.shares - shares)

    db.commit()
    db.refresh(tx)
    return {
        "id": tx.id,
        "holding_id": tx.holding_id,
        "tx_type": tx.tx_type,
        "price": tx.price,
        "shares": tx.shares,
        "amount": tx.amount,
        "note": tx.note or "",
        "tx_date": str(tx.tx_date) if tx.tx_date else "",
    }


# --- Holding Detail ---
@router.get("/holdings/{holding_id}/detail")
def holding_detail(holding_id: int, db: Session = Depends(get_db)):
    """Get detailed holding info with price history and transactions."""
    from app.services.market_service import fetch_holding_price

    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    # Current market data
    market = fetch_holding_price(holding.code, holding.asset_type)
    current_price = market.get("current_price", 0) if market else holding.cost_price
    market_value = current_price * holding.shares
    cost_value = holding.cost_price * holding.shares
    profit = market_value - cost_value
    profit_pct = (profit / cost_value * 100) if cost_value > 0 else 0

    # Price history
    history = (
        db.query(PriceHistory)
        .filter(PriceHistory.holding_id == holding_id)
        .order_by(PriceHistory.recorded_at.asc())
        .all()
    )

    # Transactions
    txs = (
        db.query(Transaction)
        .filter(Transaction.holding_id == holding_id)
        .order_by(Transaction.tx_date.desc())
        .all()
    )

    return {
        "holding": {
            "id": holding.id,
            "name": holding.name,
            "code": holding.code,
            "asset_type": holding.asset_type,
            "cost_price": holding.cost_price,
            "shares": holding.shares,
            "current_price": current_price,
            "market_value": round(market_value, 2),
            "cost_value": round(cost_value, 2),
            "profit": round(profit, 2),
            "profit_pct": round(profit_pct, 2),
            "change_pct": market.get("change_pct", 0) if market else 0,
        },
        "price_history": [
            {"price": p.price, "date": str(p.recorded_at)} for p in history
        ],
        "transactions": [
            {
                "id": t.id,
                "tx_type": t.tx_type,
                "price": t.price,
                "shares": t.shares,
                "amount": t.amount,
                "note": t.note or "",
                "tx_date": str(t.tx_date) if t.tx_date else "",
            }
            for t in txs
        ],
    }


# --- Market Indices ---
@router.get("/market-indices")
def get_market_indices():
    """获取A股主要指数实时数据."""
    from app.services.market_service import fetch_stock_price

    indices = [
        {"name": "上证指数", "code": "sh000001"},
        {"name": "深证成指", "code": "sz399001"},
        {"name": "创业板指", "code": "sz399006"},
        {"name": "沪深300", "code": "sh000300"},
    ]

    results = []
    for idx in indices:
        data = fetch_stock_price(idx["code"])
        if data:
            results.append({
                "name": data.get("name", idx["name"]),
                "code": idx["code"],
                "price": data.get("current_price", 0),
                "change_pct": data.get("change_pct", 0),
            })
        else:
            results.append({
                "name": idx["name"],
                "code": idx["code"],
                "price": 0,
                "change_pct": 0,
            })

    return {"indices": results}


# --- Sector Fund Flow ---
@router.get("/sector-flow")
def get_sector_flow(
    type: str = "industry",
    sort_by: str = "main_net_inflow",
    order: str = "desc",
    limit: int = 30,
):
    """获取A股板块主力资金流入流出数据.

    Args:
        type: 'industry' 行业板块 / 'concept' 概念板块
        sort_by: 排序字段 (main_net_inflow, change_pct, etc.)
        order: 'desc' 降序 / 'asc' 升序
        limit: 返回数量 (max 100)
    """
    from app.services.sector_flow_service import fetch_sector_flow, get_sector_flow_summary

    if type not in ("industry", "concept"):
        type = "industry"

    flows = fetch_sector_flow(type, sort_by=sort_by, order=order, limit=min(limit, 100))
    summary = get_sector_flow_summary(type)

    return {
        "type": type,
        "flows": flows,
        "summary": summary,
    }


@router.get("/sector-flow/market-status")
def get_market_status():
    """获取A股当前市场状态."""
    from app.services.sector_flow_service import get_market_status as _get_status
    return _get_status()


@router.get("/sector-flow/daily-summary")
def get_daily_summary(date: str = None, db: Session = Depends(get_db)):
    """获取每日收盘AI总结.

    Args:
        date: YYYY-MM-DD 格式，默认今天
    """
    from app.models.wealth import DailyMarketSummary

    if not date:
        from datetime import date as _date
        date = _date.today().isoformat()

    summary = db.query(DailyMarketSummary).filter(
        DailyMarketSummary.summary_date == date
    ).first()

    if not summary:
        return {"date": date, "summary": None, "message": "当日总结尚未生成"}

    return {
        "date": summary.summary_date,
        "summary": summary.summary_content,
        "net_inflow_count": summary.net_inflow_count,
        "net_outflow_count": summary.net_outflow_count,
        "total_net_flow": summary.total_net_flow,
        "top_inflow_sectors": summary.top_inflow_sectors,
        "top_outflow_sectors": summary.top_outflow_sectors,
        "created_at": str(summary.created_at),
    }


@router.get("/sector-flow/daily-summaries")
def list_daily_summaries(limit: int = 7, db: Session = Depends(get_db)):
    """获取最近N天的收盘总结列表."""
    from app.models.wealth import DailyMarketSummary

    summaries = db.query(DailyMarketSummary).order_by(
        DailyMarketSummary.summary_date.desc()
    ).limit(limit).all()

    return [
        {
            "date": s.summary_date,
            "summary": s.summary_content,
            "net_inflow_count": s.net_inflow_count,
            "net_outflow_count": s.net_outflow_count,
            "total_net_flow": s.total_net_flow,
            "created_at": str(s.created_at),
        }
        for s in summaries
    ]


@router.post("/sector-flow/generate-summary")
def generate_daily_summary_api(db: Session = Depends(get_db)):
    """手动生成今日收盘总结."""
    from datetime import date as _date
    from app.services.sector_flow_service import (
        save_daily_snapshot, get_sector_flow_summary,
    )
    from app.services.llm_service import generate_daily_market_summary
    from app.models.wealth import DailyMarketSummary
    import json

    today = _date.today().isoformat()

    # Check if already exists
    existing = db.query(DailyMarketSummary).filter(
        DailyMarketSummary.summary_date == today
    ).first()
    if existing:
        return {"date": today, "summary": existing.summary_content, "cached": True}

    # Save snapshots
    save_daily_snapshot(db, today)

    # Get summaries
    industry_summary = get_sector_flow_summary("industry")
    concept_summary = get_sector_flow_summary("concept")

    if "error" in industry_summary and "error" in concept_summary:
        raise HTTPException(status_code=503, detail="无法获取板块数据")

    # Generate AI summary
    try:
        summary_text = generate_daily_market_summary(
            today, industry_summary, concept_summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI总结生成失败: {str(e)}")

    # Save to DB
    record = DailyMarketSummary(
        summary_date=today,
        summary_content=summary_text,
        net_inflow_count=industry_summary.get("inflow_count", 0),
        net_outflow_count=industry_summary.get("outflow_count", 0),
        total_net_flow=industry_summary.get("net_flow", 0),
        top_inflow_sectors=json.dumps(
            [s["name"] for s in industry_summary.get("top_inflow", [])[:5]],
            ensure_ascii=False,
        ),
        top_outflow_sectors=json.dumps(
            [s["name"] for s in industry_summary.get("top_outflow", [])[:5]],
            ensure_ascii=False,
        ),
    )
    db.add(record)
    db.commit()

    return {"date": today, "summary": summary_text, "cached": False}


# --- Benchmark Comparison ---
@router.get("/holdings/{holding_id}/benchmark")
def holding_benchmark(holding_id: int, db: Session = Depends(get_db)):
    """Compare holding performance against CSI 300 benchmark."""
    from app.services.market_service import fetch_holding_price

    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    # Get holding price history
    history = (
        db.query(PriceHistory)
        .filter(PriceHistory.holding_id == holding_id)
        .order_by(PriceHistory.recorded_at.asc())
        .all()
    )

    if not history or len(history) < 2:
        return {
            "holding_return": 0,
            "benchmark_return": 0,
            "alpha": 0,
            "history": [],
            "message": "数据不足，需要至少2天价格记录才能对比",
        }

    first_price = history[0].price
    last_price = history[-1].price
    holding_return = ((last_price - first_price) / first_price * 100) if first_price > 0 else 0

    # Fetch CSI 300 current data (sh000300)
    csi300 = fetch_stock_price_raw("sh000300")
    benchmark_return = csi300.get("change_pct", 0) if csi300 else 0

    alpha = round(holding_return - benchmark_return, 2)

    return {
        "holding_return": round(holding_return, 2),
        "benchmark_return": benchmark_return,
        "alpha": alpha,
        "holding_name": holding.name,
        "benchmark_name": "沪深300",
        "days": len(history),
        "history": [
            {"price": p.price, "date": str(p.recorded_at)} for p in history[-30:]
        ],
    }


def fetch_stock_price_raw(code: str) -> dict:
    """Raw stock price fetch without cache."""
    try:
        from app.services.market_service import fetch_stock_price
        return fetch_stock_price(code) or {}
    except Exception:
        return {}


# --- Portfolio Performance ---
@router.get("/portfolio/performance")
def get_portfolio_performance(days: int = 90, db: Session = Depends(get_db)):
    """Get portfolio value time series from PriceHistory data."""
    holdings = db.query(Holding).all()
    if not holdings:
        return {"series": [], "total_days": 0}

    cutoff = datetime.utcnow() - timedelta(days=days)

    # Get all price histories for all holdings
    all_histories = {}
    for h in holdings:
        history = (
            db.query(PriceHistory)
            .filter(PriceHistory.holding_id == h.id, PriceHistory.recorded_at >= cutoff)
            .order_by(PriceHistory.recorded_at)
            .all()
        )
        all_histories[h.id] = {str(p.recorded_at.date()): p.price for p in history}

    # Build date-keyed portfolio values
    from collections import OrderedDict
    portfolio_by_date = OrderedDict()

    for h in holdings:
        for date_str, price in all_histories.get(h.id, {}).items():
            if date_str not in portfolio_by_date:
                portfolio_by_date[date_str] = 0
            portfolio_by_date[date_str] += price * h.shares

    series = [
        {"date": d, "value": round(v, 2)}
        for d, v in portfolio_by_date.items()
    ]

    return {"series": series, "total_days": len(series)}


@router.get("/portfolio/risk-metrics")
def get_risk_metrics(db: Session = Depends(get_db)):
    """Calculate portfolio risk metrics from PriceHistory data."""
    import math

    holdings = db.query(Holding).all()
    if not holdings:
        return {"volatility": 0, "max_drawdown": 0, "sharpe_ratio": 0, "total_days": 0}

    # Build portfolio daily values
    cutoff = datetime.utcnow() - timedelta(days=90)
    from collections import OrderedDict
    portfolio_by_date = OrderedDict()

    for h in holdings:
        history = (
            db.query(PriceHistory)
            .filter(PriceHistory.holding_id == h.id, PriceHistory.recorded_at >= cutoff)
            .order_by(PriceHistory.recorded_at)
            .all()
        )
        for p in history:
            d = str(p.recorded_at.date())
            if d not in portfolio_by_date:
                portfolio_by_date[d] = 0
            portfolio_by_date[d] += p.price * h.shares

    values = list(portfolio_by_date.values())
    if len(values) < 3:
        return {"volatility": 0, "max_drawdown": 0, "sharpe_ratio": 0, "total_days": len(values)}

    # Daily returns
    returns = [(values[i] - values[i - 1]) / values[i - 1] for i in range(1, len(values)) if values[i - 1] > 0]
    if not returns:
        return {"volatility": 0, "max_drawdown": 0, "sharpe_ratio": 0, "total_days": len(values)}

    # Annualized volatility (daily std * sqrt(252))
    mean_return = sum(returns) / len(returns)
    variance = sum((r - mean_return) ** 2 for r in returns) / (len(returns) - 1) if len(returns) > 1 else 0
    daily_vol = math.sqrt(variance) if variance > 0 else 0
    annual_vol = daily_vol * math.sqrt(252)

    # Max drawdown
    peak = values[0]
    max_dd = 0
    for v in values:
        if v > peak:
            peak = v
        dd = (peak - v) / peak if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd

    # Sharpe ratio (annualized, risk-free rate = 2%)
    annual_return = mean_return * 252
    sharpe = (annual_return - 0.02) / annual_vol if annual_vol > 0 else 0

    return {
        "volatility": round(annual_vol * 100, 2),
        "max_drawdown": round(max_dd * 100, 2),
        "sharpe_ratio": round(sharpe, 2),
        "total_days": len(values),
        "annual_return": round(annual_return * 100, 2),
    }


# --- Sector Flow Trends ---
@router.get("/sector-flow/trends")
def get_sector_flow_trends(days: int = 30, db: Session = Depends(get_db)):
    """Get historical sector flow trends from daily snapshots."""
    cutoff_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    snapshots = (
        db.query(SectorFlowSnapshot)
        .filter(SectorFlowSnapshot.snapshot_date >= cutoff_date)
        .order_by(SectorFlowSnapshot.snapshot_date, SectorFlowSnapshot.main_net_inflow.desc())
        .all()
    )

    # Group by date
    from collections import defaultdict
    by_date = defaultdict(list)
    for s in snapshots:
        by_date[s.snapshot_date].append({
            "code": s.sector_code,
            "name": s.sector_name,
            "change_pct": s.change_pct,
            "main_net_inflow": s.main_net_inflow,
            "main_net_inflow_pct": s.main_net_inflow_pct,
            "super_large_net_inflow": s.super_large_net_inflow,
            "large_net_inflow": s.large_net_inflow,
        })

    # Find top sectors by total inflow across all dates
    sector_totals = defaultdict(float)
    for s in snapshots:
        if s.sector_type == "industry":
            sector_totals[s.sector_name] += s.main_net_inflow

    top_sectors = sorted(sector_totals.items(), key=lambda x: abs(x[1]), reverse=True)[:10]

    # Build trend data for top sectors
    trend_data = {}
    for name, _ in top_sectors:
        trend_data[name] = []
        for date_str in sorted(by_date.keys()):
            sector_entry = next((s for s in by_date[date_str] if s["name"] == name), None)
            if sector_entry:
                trend_data[name].append({
                    "date": date_str,
                    "inflow": sector_entry["main_net_inflow"],
                    "change_pct": sector_entry["change_pct"],
                })

    return {
        "days": days,
        "dates": sorted(by_date.keys()),
        "top_sectors": [{"name": n, "total_inflow": round(v, 2)} for n, v in top_sectors],
        "trends": trend_data,
    }


# --- Transaction CRUD ---
@router.delete("/holdings/{holding_id}/transactions/{tx_id}")
def delete_transaction(holding_id: int, tx_id: int, db: Session = Depends(get_db)):
    """Delete a transaction."""
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id, Transaction.holding_id == holding_id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return {"ok": True}


@router.patch("/holdings/{holding_id}/transactions/{tx_id}")
def update_transaction(holding_id: int, tx_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    """Update a transaction."""
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id, Transaction.holding_id == holding_id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if "price" in data:
        tx.price = float(data["price"])
    if "shares" in data:
        tx.shares = float(data["shares"])
    if "note" in data:
        tx.note = data["note"]
    if "tx_date" in data and data["tx_date"]:
        try:
            tx.tx_date = datetime.fromisoformat(data["tx_date"])
        except (ValueError, TypeError):
            pass

    tx.amount = tx.price * tx.shares
    db.commit()
    db.refresh(tx)
    return {
        "id": tx.id,
        "holding_id": tx.holding_id,
        "tx_type": tx.tx_type,
        "price": tx.price,
        "shares": tx.shares,
        "amount": tx.amount,
        "note": tx.note or "",
        "tx_date": str(tx.tx_date) if tx.tx_date else "",
    }


# --- Insight Edit ---
@router.patch("/insights/{insight_id}", response_model=InsightOut)
def update_insight(insight_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    """Update an insight."""
    insight = db.query(Insight).filter(Insight.id == insight_id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    if "content" in data:
        insight.content = data["content"]
    if "source" in data:
        insight.source = data["source"]
    if "tags" in data:
        insight.tags = data["tags"]

    db.commit()
    db.refresh(insight)
    return insight


# --- Daily AI Brief ---
# --- Watchlist ---
@router.get("/watchlist")
def list_watchlist(db: Session = Depends(get_db)):
    items = db.query(WatchlistItem).order_by(WatchlistItem.created_at.desc()).all()
    result = []
    for item in items:
        d = {
            "id": item.id, "name": item.name, "code": item.code,
            "asset_type": item.asset_type, "target_price": item.target_price,
            "note": item.note, "created_at": str(item.created_at),
        }
        # Fetch live price if possible
        try:
            from app.services.market_service import fetch_holding_price
            price_data = fetch_holding_price(item.code, item.asset_type)
            if price_data:
                d["current_price"] = price_data.get("price")
                d["change_pct"] = price_data.get("change_pct", 0)
        except Exception:
            pass
        result.append(d)
    return result


@router.post("/watchlist")
def add_watchlist_item(data: dict = Body(...), db: Session = Depends(get_db)):
    name = data.get("name", "").strip()
    code = data.get("code", "").strip()
    if not name or not code:
        raise HTTPException(status_code=400, detail="名称和代码不能为空")
    # Check duplicate
    existing = db.query(WatchlistItem).filter(WatchlistItem.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="该标的已在关注列表中")
    item = WatchlistItem(
        name=name, code=code,
        asset_type=data.get("asset_type", "fund"),
        target_price=data.get("target_price"),
        note=data.get("note", ""),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "name": item.name, "code": item.code}


@router.delete("/watchlist/{item_id}")
def delete_watchlist_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="关注项不存在")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.patch("/watchlist/{item_id}")
def update_watchlist_item(item_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="关注项不存在")
    for field in ("target_price", "note"):
        if field in data:
            setattr(item, field, data[field])
    db.commit()
    db.refresh(item)
    return {"id": item.id, "name": item.name}


@router.post("/watchlist/{item_id}/convert")
def convert_watchlist_to_holding(item_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    """Convert a watchlist item into a holding (buy)."""
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="关注项不存在")
    cost_price = data.get("cost_price")
    shares = data.get("shares")
    if not cost_price or not shares:
        raise HTTPException(status_code=400, detail="请提供买入价和份额")
    holding = Holding(
        name=item.name, code=item.code, asset_type=item.asset_type,
        cost_price=float(cost_price), shares=float(shares),
    )
    db.add(holding)
    db.delete(item)
    db.commit()
    db.refresh(holding)
    return {"id": holding.id, "name": holding.name}


# --- Price Alerts ---
@router.get("/alerts")
def list_alerts(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(PriceAlert)
    if active_only:
        query = query.filter(PriceAlert.is_active == 1)
    alerts = query.order_by(PriceAlert.created_at.desc()).all()
    result = []
    for a in alerts:
        holding = db.query(Holding).filter(Holding.id == a.holding_id).first()
        result.append({
            "id": a.id,
            "holding_id": a.holding_id,
            "holding_name": holding.name if holding else "已删除",
            "holding_code": holding.code if holding else "",
            "alert_type": a.alert_type,
            "target_price": a.target_price,
            "is_active": a.is_active,
            "triggered_at": str(a.triggered_at) if a.triggered_at else None,
            "created_at": str(a.created_at),
        })
    return result


@router.post("/alerts")
def create_alert(data: dict = Body(...), db: Session = Depends(get_db)):
    holding_id = data.get("holding_id")
    alert_type = data.get("alert_type", "above")
    target_price = data.get("target_price")
    if not holding_id or not target_price:
        raise HTTPException(status_code=400, detail="持仓和目标价不能为空")
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="持仓不存在")
    alert = PriceAlert(
        holding_id=holding_id,
        alert_type=alert_type,
        target_price=float(target_price),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"id": alert.id, "holding_name": holding.name}


@router.delete("/alerts/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(PriceAlert).filter(PriceAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="提醒不存在")
    db.delete(alert)
    db.commit()
    return {"ok": True}


@router.post("/alerts/check")
def check_alerts(db: Session = Depends(get_db)):
    """Check all active alerts against current prices. Returns triggered alerts."""
    from app.services.market_service import fetch_holding_price
    active_alerts = db.query(PriceAlert).filter(PriceAlert.is_active == 1).all()
    triggered = []
    for alert in active_alerts:
        holding = db.query(Holding).filter(Holding.id == alert.holding_id).first()
        if not holding:
            continue
        try:
            price_data = fetch_holding_price(holding.code, holding.asset_type)
            if not price_data or not price_data.get("price"):
                continue
            current_price = price_data["price"]
            should_trigger = False
            if alert.alert_type == "above" and current_price >= alert.target_price:
                should_trigger = True
            elif alert.alert_type == "below" and current_price <= alert.target_price:
                should_trigger = True
            if should_trigger:
                alert.is_active = 0
                from datetime import datetime
                alert.triggered_at = datetime.utcnow()
                triggered.append({
                    "alert_id": alert.id,
                    "holding_name": holding.name,
                    "alert_type": alert.alert_type,
                    "target_price": alert.target_price,
                    "current_price": current_price,
                })
        except Exception:
            continue
    db.commit()
    return {"checked": len(active_alerts), "triggered": triggered}


# --- Fund Research ---
@router.get("/fund-research/{code}")
def fund_research(code: str):
    """Get detailed fund info including multi-period returns and volatility."""
    from app.services.market_service import get_fund_detail
    detail = get_fund_detail(code)
    if not detail:
        raise HTTPException(status_code=404, detail="基金数据获取失败")
    return detail


@router.get("/portfolio/export")
def export_portfolio(db: Session = Depends(get_db)):
    """Generate a shareable text summary of the portfolio."""
    from app.services.market_service import fetch_holding_price

    holdings = db.query(Holding).all()
    if not holdings:
        return {"text": "暂无持仓数据"}

    # Fetch current prices
    enriched = []
    total_cost = 0
    total_market = 0
    for h in holdings:
        price_data = fetch_holding_price(h.code, h.asset_type)
        current_price = price_data.get("price", h.cost_price) if price_data else h.cost_price
        market_value = current_price * h.shares
        cost_value = h.cost_price * h.shares
        profit = market_value - cost_value
        profit_pct = (profit / cost_value * 100) if cost_value > 0 else 0
        total_cost += cost_value
        total_market += market_value
        enriched.append({
            "name": h.name, "code": h.code, "asset_type": h.asset_type,
            "shares": h.shares, "cost_price": h.cost_price,
            "current_price": current_price, "market_value": market_value,
            "profit": profit, "profit_pct": profit_pct,
        })

    total_profit = total_market - total_cost
    total_pct = (total_profit / total_cost * 100) if total_cost > 0 else 0

    # Sort by market_value desc
    enriched.sort(key=lambda x: x["market_value"], reverse=True)

    # Build text
    lines = []
    lines.append("📊 我的投资组合")
    lines.append(f"📅 {datetime.utcnow().strftime('%Y-%m-%d')}")
    lines.append("")
    lines.append(f"💰 总市值: ¥{total_market:,.0f}")
    lines.append(f"📈 总收益: {'+' if total_profit >= 0 else ''}{total_profit:,.0f} ({'+' if total_pct >= 0 else ''}{total_pct:.1f}%)")
    lines.append(f"📦 持仓数: {len(holdings)}")
    lines.append("")
    lines.append("—— 持仓明细 ——")

    TYPE_LABELS = {"fund": "基金", "stock": "A股", "a_share": "A股", "us_stock": "美股", "crypto": "加密", "hk_stock": "港股"}
    for item in enriched:
        type_label = TYPE_LABELS.get(item["asset_type"], item["asset_type"])
        emoji = "🔴" if item["profit_pct"] >= 0 else "🟢"
        lines.append(f"{emoji} {item['name']} ({type_label})")
        lines.append(f"   市值 ¥{item['market_value']:,.0f} | {'+' if item['profit_pct'] >= 0 else ''}{item['profit_pct']:.1f}%")

    # Top/bottom performers
    if len(enriched) >= 2:
        best = max(enriched, key=lambda x: x["profit_pct"])
        worst = min(enriched, key=lambda x: x["profit_pct"])
        lines.append("")
        lines.append(f"🏆 最佳: {best['name']} +{best['profit_pct']:.1f}%")
        lines.append(f"📉 最差: {worst['name']} {worst['profit_pct']:.1f}%")

    lines.append("")
    lines.append("—— Generated by Aura ——")

    return {"text": "\n".join(lines), "date": datetime.utcnow().strftime("%Y-%m-%d")}


# --- Transactions Overview ---
@router.get("/transactions/overview")
def get_transactions_overview(limit: int = 20, db: Session = Depends(get_db)):
    """Aggregated transaction history across all holdings with summary stats."""
    holdings = {h.id: h for h in db.query(Holding).all()}
    txs = db.query(Transaction).order_by(Transaction.tx_date.desc()).limit(limit * 3).all()

    # Build enriched transaction list
    enriched = []
    total_buy = 0
    total_sell = 0
    monthly_flow: dict[str, float] = {}

    for tx in txs:
        holding = holdings.get(tx.holding_id)
        if not holding:
            continue
        enriched.append({
            "id": tx.id,
            "holding_id": tx.holding_id,
            "holding_name": holding.name,
            "holding_code": holding.code,
            "asset_type": holding.asset_type,
            "tx_type": tx.tx_type,
            "price": tx.price,
            "shares": tx.shares,
            "amount": tx.amount,
            "note": tx.note or "",
            "tx_date": str(tx.tx_date)[:10],
        })
        month_key = str(tx.tx_date)[:7]
        if tx.tx_type == "buy":
            total_buy += tx.amount
            monthly_flow[month_key] = monthly_flow.get(month_key, 0) - tx.amount
        else:
            total_sell += tx.amount
            monthly_flow[month_key] = monthly_flow.get(month_key, 0) + tx.amount

    # Sort monthly flow
    sorted_months = sorted(monthly_flow.items())[-12:]  # Last 12 months

    return {
        "transactions": enriched[:limit],
        "summary": {
            "total_buy": total_buy,
            "total_sell": total_sell,
            "net_flow": total_sell - total_buy,
            "tx_count": len(enriched),
        },
        "monthly_flow": [{"month": m, "flow": f} for m, f in sorted_months],
    }


@router.post("/daily-brief")
def generate_daily_brief_api(db: Session = Depends(get_db)):
    """Generate cross-module AI daily brief (holdings + research + notes + todos)."""
    from app.services.llm_service import generate_daily_review

    holdings = db.query(Holding).all()
    if not holdings:
        raise HTTPException(status_code=400, detail="No holdings to analyze")

    holding_data = [
        {
            "name": h.name,
            "code": h.code,
            "cost_price": h.cost_price,
            "shares": h.shares,
            "asset_type": h.asset_type,
        }
        for h in holdings
    ]

    # Gather recent insights
    insights = db.query(Insight).order_by(Insight.created_at.desc()).limit(5).all()
    insight_data = [{"content": i.content, "source": i.source or ""} for i in insights]

    try:
        from app.models.muse import Note as NoteModel, MoodRecord
        from app.models.productivity import SmartTodo
        from app.models.research import Article

        # Gather articles
        articles = db.query(Article).order_by(Article.created_at.desc()).limit(5).all()
        article_data = [
            {"title": a.title, "abstract": a.abstract or "", "summary": a.summary or ""}
            for a in articles
        ]

        # Gather notes
        notes = db.query(NoteModel).order_by(NoteModel.created_at.desc()).limit(5).all()
        note_data = [{"content": n.content, "mood": n.mood or ""} for n in notes]

        # Gather todos
        todos = db.query(SmartTodo).order_by(SmartTodo.created_at.desc()).limit(5).all()
        todo_data = [{"title": t.parsed_title or t.content, "is_done": t.is_done} for t in todos]

        # Gather moods
        moods = db.query(MoodRecord).order_by(MoodRecord.date.desc()).limit(7).all()
        mood_data = [{"mood": m.mood, "date": str(m.date)} for m in moods]
    except Exception:
        article_data, note_data, todo_data, mood_data = [], [], [], []

    try:
        brief = generate_daily_review(
            article_data, holding_data, note_data, todo_data, mood_data
        )
        return {"brief": brief, "date": datetime.utcnow().strftime("%Y-%m-%d")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI brief generation failed: {str(e)}")
