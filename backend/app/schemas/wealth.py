from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class HoldingCreate(BaseModel):
    name: str
    code: str
    asset_type: str = "fund"
    cost_price: float
    shares: float


class HoldingUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    asset_type: Optional[str] = None
    cost_price: Optional[float] = None
    shares: Optional[float] = None


class HoldingOut(BaseModel):
    id: int
    name: str
    code: str
    asset_type: str
    cost_price: float
    shares: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InsightCreate(BaseModel):
    content: str
    source: str = ""
    tags: str = ""


class InsightOut(BaseModel):
    id: int
    content: str
    source: str
    tags: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReportOut(BaseModel):
    id: int
    report_content: str
    period_start: datetime
    period_end: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class HoldingOCRResult(BaseModel):
    name: str
    code: str
    cost_price: float
    shares: float
    asset_type: str = "fund"


class HoldingOCRResponse(BaseModel):
    holdings: list[HoldingOCRResult]
