import httpx
import re
import json
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# Simple TTL cache for market prices (code -> {data, timestamp})
_price_cache: dict = {}
_CACHE_TTL = 300  # 5 minutes

# Sina Finance API endpoints (HTTP only - HTTPS has SSL issues in some networks)
SINA_STOCK_URL = "http://hq.sinajs.cn/list="
EASTMONEY_FUND_URL = "http://fund.eastmoney.com/pingzhongdata/{code}.js"


def _parse_sina_stock(raw: str) -> Optional[dict]:
    """Parse Sina stock quote response."""
    match = re.search(r'hq_str_(\w+)="(.+?)"', raw)
    if not match:
        return None

    code = match.group(1)
    data = match.group(2).split(",")

    if len(data) < 32:
        return None

    try:
        name = data[0]
        current_price = float(data[3]) if data[3] else 0.0
        yesterday_close = float(data[2]) if data[2] else 0.0
        change_pct = 0.0
        if yesterday_close > 0 and current_price > 0:
            change_pct = round((current_price - yesterday_close) / yesterday_close * 100, 2)

        return {
            "code": code,
            "name": name,
            "current_price": current_price,
            "yesterday_close": yesterday_close,
            "change_pct": change_pct,
            "high": float(data[4]) if data[4] else 0.0,
            "low": float(data[5]) if data[5] else 0.0,
            "volume": data[8],
            "date": data[30],
            "time": data[31],
        }
    except (ValueError, IndexError) as e:
        logger.warning(f"Failed to parse Sina stock data for {code}: {e}")
        return None


def _parse_eastmoney_fund(raw: str, code: str) -> Optional[dict]:
    """Parse eastmoney fund NAV response."""
    # Extract fund name
    name_match = re.search(r'fS_name\s*=\s*"(.+?)"', raw)
    name = name_match.group(1) if name_match else ""

    # Extract NAV trend data: [{x: timestamp_ms, y: nav}, ...]
    nav_match = re.search(r'Data_netWorthTrend\s*=\s*(\[.+?\]);', raw)
    if not nav_match:
        return None

    try:
        data = json.loads(nav_match.group(1))
        if not data:
            return None
        last = data[-1]
        nav = float(last["y"])

        # Calculate change from previous day
        change_pct = 0.0
        if len(data) >= 2:
            prev_nav = float(data[-2]["y"])
            if prev_nav > 0:
                change_pct = round((nav - prev_nav) / prev_nav * 100, 2)

        # Convert timestamp to date string
        from datetime import datetime
        date_str = datetime.fromtimestamp(last["x"] / 1000).strftime("%Y-%m-%d")

        return {
            "code": code,
            "name": name,
            "current_price": nav,
            "nav": nav,
            "estimated_nav": 0.0,
            "estimated_change_pct": change_pct,
            "date": date_str,
        }
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        logger.warning(f"Failed to parse eastmoney fund data for {code}: {e}")
        return None


def fetch_stock_price(code: str) -> Optional[dict]:
    """Fetch real-time stock price from Sina Finance.

    Args:
        code: Stock code. A-share format: sh600000 / sz000001. US stock: usAAPL / usTSLA.
    """
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(
                SINA_STOCK_URL + code,
                headers={"Referer": "http://finance.sina.com.cn"},
            )
            resp.raise_for_status()
            return _parse_sina_stock(resp.text)
    except Exception as e:
        logger.warning(f"Failed to fetch stock price for {code}: {e}")
        return None


def fetch_fund_nav(code: str) -> Optional[dict]:
    """Fetch fund NAV from eastmoney."""
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(EASTMONEY_FUND_URL.format(code=code))
            resp.raise_for_status()
            return _parse_eastmoney_fund(resp.text, code)
    except Exception as e:
        logger.warning(f"Failed to fetch fund NAV for {code}: {e}")
        return None


def fetch_holding_price(code: str, asset_type: str) -> Optional[dict]:
    """Fetch price for a holding based on its asset type. Results cached for 5 min."""
    cache_key = f"{code}:{asset_type}"
    cached = _price_cache.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _CACHE_TTL:
        return cached["data"]

    if asset_type == "fund":
        result = fetch_fund_nav(code)
    elif asset_type in ("stock", "a_share"):
        if code.startswith("6"):
            result = fetch_stock_price(f"sh{code}")
        else:
            result = fetch_stock_price(f"sz{code}")
    elif asset_type == "us_stock":
        result = fetch_stock_price(f"us{code.upper()}")
    elif asset_type == "hk_stock":
        result = fetch_stock_price(f"hk{code}")
    else:
        result = None

    if result:
        _price_cache[cache_key] = {"data": result, "ts": time.time()}
    return result


def get_fund_detail(code: str) -> Optional[dict]:
    """Fetch detailed fund info from Eastmoney including NAV history and returns."""
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(EASTMONEY_FUND_URL.format(code=code))
            resp.raise_for_status()
            raw = resp.text

        # Extract fund name
        name_match = re.search(r'fS_name\s*=\s*"(.+?)"', raw)
        name = name_match.group(1) if name_match else ""

        # Extract fund type
        type_match = re.search(r'fS_code\s*=\s*"(.+?)"', raw)

        # Extract NAV trend data
        nav_match = re.search(r'Data_netWorthTrend\s*=\s*(\[.+?\]);', raw)
        if not nav_match:
            return None

        nav_data = json.loads(nav_match.group(1))
        if not nav_data or len(nav_data) < 2:
            return None

        # Calculate returns over different periods
        now_ts = nav_data[-1]["x"]
        last_nav = float(nav_data[-1]["y"])

        def nav_at_days_ago(days):
            target_ts = now_ts - days * 86400000
            for item in reversed(nav_data):
                if item["x"] <= target_ts:
                    return float(item["y"])
            return float(nav_data[0]["y"])

        nav_7d = nav_at_days_ago(7)
        nav_30d = nav_at_days_ago(30)
        nav_90d = nav_at_days_ago(90)
        nav_180d = nav_at_days_ago(180)
        nav_365d = nav_at_days_ago(365)

        def pct_change(old, new):
            return round((new - old) / old * 100, 2) if old > 0 else 0

        # Recent NAV history (last 30 points for sparkline)
        step = max(1, len(nav_data) // 30)
        recent_nav = [{"date": item["x"], "nav": float(item["y"])} for item in nav_data[::step][-30:]]

        # Calculate volatility from daily returns
        daily_returns = []
        for i in range(1, min(60, len(nav_data))):
            prev = float(nav_data[-(i + 1)]["y"])
            curr = float(nav_data[-i]["y"])
            if prev > 0:
                daily_returns.append((curr - prev) / prev)
        volatility = 0.0
        if len(daily_returns) > 5:
            import statistics
            volatility = round(statistics.stdev(daily_returns) * (252 ** 0.5) * 100, 1)

        return {
            "code": code,
            "name": name,
            "nav": last_nav,
            "return_7d": pct_change(nav_7d, last_nav),
            "return_30d": pct_change(nav_30d, last_nav),
            "return_90d": pct_change(nav_90d, last_nav),
            "return_180d": pct_change(nav_180d, last_nav),
            "return_365d": pct_change(nav_365d, last_nav),
            "volatility": volatility,
            "data_points": len(nav_data),
            "recent_nav": recent_nav,
        }
    except Exception as e:
        logger.warning(f"Failed to fetch fund detail for {code}: {e}")
        return None


def search_funds(query: str, limit: int = 10) -> list:
    """Search funds by name or code via Eastmoney API."""
    if not query or len(query) < 2:
        return []

    try:
        url = "https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx"
        params = {
            "m": 1,
            "key": query,
            "pageindex": 1,
            "pagesize": limit,
        }
        resp = httpx.get(url, params=params, timeout=10.0, follow_redirects=True)
        resp.raise_for_status()
        data = resp.json()

        results = []
        for item in (data.get("Datas") or []):
            results.append({
                "code": item.get("CODE", ""),
                "name": item.get("NAME", ""),
                "type": item.get("FundBaseInfo", {}).get("FTYPE", ""),
            })
        return results
    except Exception as e:
        logger.warning(f"Fund search failed: {e}")
        return []
