import httpx
import re
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

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
    """Fetch price for a holding based on its asset type."""
    if asset_type == "fund":
        return fetch_fund_nav(code)
    elif asset_type in ("stock", "a_share"):
        # Auto-detect exchange
        if code.startswith("6"):
            return fetch_stock_price(f"sh{code}")
        else:
            return fetch_stock_price(f"sz{code}")
    elif asset_type == "us_stock":
        return fetch_stock_price(f"us{code.upper()}")
    elif asset_type == "hk_stock":
        return fetch_stock_price(f"hk{code}")
    return None
