from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models.wealth import Holding, Insight, WeeklyReport
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
