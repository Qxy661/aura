import time
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./aura.db"

    # LLM
    llm_api_key: str = ""
    llm_base_url: str = "https://api.deepseek.com/v1"
    llm_model: str = "deepseek-chat"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # arXiv
    arxiv_keywords: str = "machine learning,large language model,AI agent"

    # RSS
    rss_feeds: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# --- Runtime config with TTL cache ---
_settings: Settings = None
_settings_ts: float = 0
_runtime_overrides: dict = {}

_TTL = 1.0  # seconds


def get_settings() -> Settings:
    global _settings, _settings_ts
    now = time.time()
    if _settings is None or (now - _settings_ts) > _TTL:
        _settings = Settings()
        _settings_ts = now
    return _settings


def set_runtime_overrides(overrides: dict) -> None:
    """Store runtime overrides from frontend (API key, base URL, model)."""
    global _runtime_overrides, _settings_ts
    _runtime_overrides = {k: v for k, v in overrides.items() if v is not None}
    # Force settings reload on next call
    _settings_ts = 0


def get_runtime_overrides() -> dict:
    return _runtime_overrides.copy()


def get_effective_llm_config() -> dict:
    """Return merged LLM config: env defaults + runtime overrides."""
    base = get_settings()
    return {
        "api_key": _runtime_overrides.get("api_key") or base.llm_api_key,
        "base_url": _runtime_overrides.get("base_url") or base.llm_base_url,
        "model": _runtime_overrides.get("model") or base.llm_model,
    }
