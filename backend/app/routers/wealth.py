from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app.models.wealth import Holding, Insight, WeeklyReport, PriceHistory, Transaction
from app.schemas.wealth import (
    HoldingCreate, HoldingUpdate, HoldingOut,
    InsightCreate, InsightOut,
    ReportOut,
)

router = APIRouter(prefix="/api/wealth", tags=["wealth"])


# --- Holdings ---
@router.get("/holdings", response_model=list[HoldingOut])
def list_holdings(db: Session = Depends(get_db)):
    return db.query(Holding).order_by(Holding.created_at.desc()).all()


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
            "change_pct": market.get("change_pct", market.get("estimated_change_pct", 0)) if market else 0,
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
    from app.models.muse import Insight

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
