"""A股板块主力资金流向数据服务

数据源: 东方财富 push2 API (免费, 无需API Key)
行业板块: fs=m:90+t:2
概念板块: fs=m:90+t:3
"""
import httpx
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# TTL cache
_flow_cache: dict = {}
_CACHE_TTL = 300  # 5 minutes, consistent with market_service

EASTMONEY_FLOW_URL = "http://push2.eastmoney.com/api/qt/clist/get"

# Fields:
# f12=板块代码, f14=板块名称, f2=最新价, f3=涨跌幅
# f62=主力净流入, f184=主力净流入占比
# f66=超大单净流入, f69=超大单净流入占比
# f72=大单净流入, f75=大单净流入占比
# f78=中单净流入, f81=中单净流入占比
# f84=小单净流入, f87=小单净流入占比
_FIELDS = "f12,f14,f2,f3,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87"

SECTOR_TYPE_MAP = {
    "industry": "m:90+t:2",
    "concept": "m:90+t:3",
}


def _parse_flow_item(item: dict) -> Optional[dict]:
    """Parse a single sector flow item from Eastmoney response."""
    try:
        name = item.get("f14", "")
        if not name or name == "-":
            return None

        def safe_float(val, default=0.0):
            if val is None or val == "-":
                return default
            try:
                return float(val)
            except (ValueError, TypeError):
                return default

        return {
            "code": item.get("f12", ""),
            "name": name,
            "price": safe_float(item.get("f2")),
            "change_pct": safe_float(item.get("f3")),
            "main_net_inflow": safe_float(item.get("f62")),
            "main_net_inflow_pct": safe_float(item.get("f184")),
            "super_large_net_inflow": safe_float(item.get("f66")),
            "super_large_net_inflow_pct": safe_float(item.get("f69")),
            "large_net_inflow": safe_float(item.get("f72")),
            "large_net_inflow_pct": safe_float(item.get("f75")),
            "medium_net_inflow": safe_float(item.get("f78")),
            "medium_net_inflow_pct": safe_float(item.get("f81")),
            "small_net_inflow": safe_float(item.get("f84")),
            "small_net_inflow_pct": safe_float(item.get("f87")),
        }
    except Exception as e:
        logger.warning(f"Failed to parse flow item: {e}")
        return None


def fetch_sector_flow(
    sector_type: str = "industry",
    sort_by: str = "main_net_inflow",
    order: str = "desc",
    limit: int = 50,
) -> list[dict]:
    """Fetch sector fund flow data from Eastmoney.

    Args:
        sector_type: 'industry' for 行业板块, 'concept' for 概念板块
        sort_by: field to sort by (main_net_inflow, change_pct, etc.)
        order: 'desc' or 'asc'
        limit: max items to return
    """
    cache_key = f"{sector_type}:{sort_by}:{order}:{limit}"
    cached = _flow_cache.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _CACHE_TTL:
        return cached["data"]

    fs = SECTOR_TYPE_MAP.get(sector_type, SECTOR_TYPE_MAP["industry"])

    # Map sort field to Eastmoney fid
    fid_map = {
        "main_net_inflow": "f62",
        "main_net_inflow_pct": "f184",
        "change_pct": "f3",
        "super_large_net_inflow": "f66",
        "large_net_inflow": "f72",
    }
    fid = fid_map.get(sort_by, "f62")
    po = 1 if order == "desc" else 0

    params = {
        "fid": fid,
        "po": po,
        "pz": min(limit, 100),
        "pn": 1,
        "np": 1,
        "fltt": 2,
        "invt": 2,
        "fs": fs,
        "fields": _FIELDS,
        "ut": "bd1d9ddb04089700cf9c27f6f7426281",
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "http://data.eastmoney.com/",
    }

    try:
        with httpx.Client(timeout=15.0, follow_redirects=True, trust_env=False) as client:
            resp = client.get(EASTMONEY_FLOW_URL, params=params, headers=headers)
            resp.raise_for_status()

            # Eastmoney returns GBK-encoded response
            raw_bytes = resp.content
            try:
                text = raw_bytes.decode("gbk")
            except UnicodeDecodeError:
                text = raw_bytes.decode("utf-8", errors="replace")

            import json
            data = json.loads(text)

        items = data.get("data", {}).get("diff", [])
        results = []
        for item in items:
            parsed = _parse_flow_item(item)
            if parsed:
                results.append(parsed)

        _flow_cache[cache_key] = {"data": results, "ts": time.time()}
        logger.info(f"Fetched {len(results)} sector flows (type={sector_type})")
        return results

    except Exception as e:
        logger.warning(f"Failed to fetch sector flow: {e}")
        return cached["data"] if cached else []


def get_sector_flow_summary(sector_type: str = "industry") -> dict:
    """Get summary stats for sector fund flows."""
    flows = fetch_sector_flow(sector_type, limit=100)
    if not flows:
        return {"error": "无法获取数据"}

    inflow_sectors = [f for f in flows if f["main_net_inflow"] > 0]
    outflow_sectors = [f for f in flows if f["main_net_inflow"] < 0]

    total_inflow = sum(f["main_net_inflow"] for f in inflow_sectors)
    total_outflow = sum(f["main_net_inflow"] for f in outflow_sectors)
    net_flow = total_inflow + total_outflow

    return {
        "total_sectors": len(flows),
        "inflow_count": len(inflow_sectors),
        "outflow_count": len(outflow_sectors),
        "total_inflow": round(total_inflow, 2),
        "total_outflow": round(total_outflow, 2),
        "net_flow": round(net_flow, 2),
        "top_inflow": sorted(inflow_sectors, key=lambda x: x["main_net_inflow"], reverse=True)[:10],
        "top_outflow": sorted(outflow_sectors, key=lambda x: x["main_net_inflow"])[:10],
    }


def save_daily_snapshot(db, snapshot_date: str) -> int:
    """Save daily closing sector flow snapshot to DB. Returns count of saved records."""
    from app.models.wealth import SectorFlowSnapshot

    # Check if already saved for this date
    existing = db.query(SectorFlowSnapshot).filter(
        SectorFlowSnapshot.snapshot_date == snapshot_date
    ).count()
    if existing > 0:
        logger.info(f"Snapshot for {snapshot_date} already exists ({existing} records)")
        return 0

    total_saved = 0
    for sector_type in ("industry", "concept"):
        flows = fetch_sector_flow(sector_type, limit=100)
        for f in flows:
            snapshot = SectorFlowSnapshot(
                snapshot_date=snapshot_date,
                sector_type=sector_type,
                sector_code=f["code"],
                sector_name=f["name"],
                change_pct=f["change_pct"],
                main_net_inflow=f["main_net_inflow"],
                main_net_inflow_pct=f["main_net_inflow_pct"],
                super_large_net_inflow=f["super_large_net_inflow"],
                large_net_inflow=f["large_net_inflow"],
                medium_net_inflow=f["medium_net_inflow"],
                small_net_inflow=f["small_net_inflow"],
            )
            db.add(snapshot)
            total_saved += 1

    try:
        db.commit()
        logger.info(f"Saved {total_saved} sector flow snapshots for {snapshot_date}")
    except Exception as e:
        db.rollback()
        logger.warning(f"Failed to save snapshots: {e}")
        return 0

    return total_saved


def get_market_status() -> dict:
    """Get current A股 market status."""
    from datetime import datetime, time as dtime

    now = datetime.now()
    weekday = now.weekday()  # 0=Mon, 6=Sun
    current_time = now.time()

    is_trading_day = weekday < 5  # Mon-Fri
    morning_open = dtime(9, 30)
    morning_close = dtime(11, 30)
    afternoon_open = dtime(13, 0)
    afternoon_close = dtime(15, 0)

    if not is_trading_day:
        status = "closed"
        label = "休市中"
    elif morning_open <= current_time <= morning_close:
        status = "trading"
        label = "交易中"
    elif afternoon_open <= current_time <= afternoon_close:
        status = "trading"
        label = "交易中"
    elif morning_close < current_time < afternoon_open:
        status = "break"
        label = "午间休市"
    elif current_time < morning_open:
        status = "pre_market"
        label = "盘前"
    else:
        status = "closed"
        label = "已收盘"

    return {
        "status": status,
        "label": label,
        "is_trading_day": is_trading_day,
        "time": now.strftime("%H:%M"),
    }
