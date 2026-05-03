from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.config import get_effective_llm_config, set_runtime_overrides, get_runtime_overrides
from app.services.llm_service import test_llm_connection

router = APIRouter(prefix="/api/settings", tags=["settings"])


class LLMConfigBody(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


@router.get("/llm")
def get_llm_config():
    """Return current LLM config (key masked)."""
    cfg = get_effective_llm_config()
    key = cfg["api_key"]
    masked = key[:4] + "****" + key[-4:] if key and len(key) > 8 else "****" if key else ""
    return {
        "api_key_masked": masked,
        "base_url": cfg["base_url"],
        "model": cfg["model"],
        "has_overrides": bool(get_runtime_overrides()),
    }


@router.post("/llm")
def save_llm_config(body: LLMConfigBody):
    """Save runtime LLM config overrides."""
    set_runtime_overrides({
        "api_key": body.api_key,
        "base_url": body.base_url,
        "model": body.model,
    })
    return {"ok": True}


@router.post("/llm/test")
def test_llm(body: LLMConfigBody):
    """Test LLM connection with provided config."""
    result = test_llm_connection(
        api_key=body.api_key,
        base_url=body.base_url,
        model=body.model,
    )
    return result
