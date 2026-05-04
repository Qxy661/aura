import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db
from app.routers import research, wealth, muse
from app.routers import settings as settings_router
from app.routers import search, productivity

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="Aura - Personal Digital Brain",
    description=(
        "个人数字外脑 API —— 科研雷达 · 财富面板 · 灵感角落\n\n"
        "## 功能模块\n"
        "- **科研论文**: arXiv/RSS 抓取、AI 摘要、文件夹/标签分类、Notion 导出\n"
        "- **财富管理**: 持仓管理、OCR 识别、实时行情、盈亏分析、AI 复盘\n"
        "- **灵感角落**: 书摘金句、闪念笔记、心情记录、塔罗指引、AI 心情关怀\n\n"
        "## 定时任务\n"
        "- 每日 07:00 自动生成书摘\n"
        "- 每日 08:00 自动抓取科研文章\n"
        "- 每日 02:00 自动备份数据库\n"
        "- 每周一 09:00 自动生成投资复盘"
    ),
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(research.router)
app.include_router(wealth.router)
app.include_router(muse.router)
app.include_router(settings_router.router)
app.include_router(search.router)
app.include_router(productivity.router)


@app.on_event("startup")
def on_startup():
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully")

    # Start background scheduler
    try:
        from app.scheduler import setup_scheduler
        setup_scheduler()
    except Exception as e:
        logger.warning(f"Failed to start scheduler: {e}")


@app.get("/")
def root():
    return {"message": "Aura API is running", "version": "0.2.0"}


@app.get("/health")
def health():
    return {"status": "ok"}


# --- Backup ---
@app.post("/api/backup")
def trigger_backup():
    """Create a manual backup of the database."""
    from app.services.backup import backup_database
    path = backup_database()
    if path:
        return {"ok": True, "path": path}
    return {"ok": False, "detail": "Backup failed"}


@app.get("/api/backup/list")
def list_backups():
    """List existing database backups."""
    from app.services.backup import get_backup_list
    return get_backup_list()
