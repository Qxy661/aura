import shutil
import logging
from datetime import datetime
from pathlib import Path
from app.config import get_settings

logger = logging.getLogger(__name__)

BACKUP_DIR = Path("backups")


def backup_database() -> str:
    """Create a timestamped backup of the SQLite database. Returns backup path."""
    settings = get_settings()
    db_path = settings.database_url.replace("sqlite:///", "")
    if db_path.startswith("./"):
        db_path = db_path[2:]

    src = Path(db_path)
    if not src.exists():
        logger.warning(f"Database file not found: {src}")
        return ""

    BACKUP_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = BACKUP_DIR / f"aura_{timestamp}.db"

    try:
        shutil.copy2(src, dest)
        logger.info(f"Database backed up to {dest}")

        # Keep only last 10 backups
        backups = sorted(BACKUP_DIR.glob("aura_*.db"), key=lambda p: p.stat().st_mtime)
        for old in backups[:-10]:
            old.unlink()
            logger.info(f"Removed old backup: {old}")

        return str(dest)
    except Exception as e:
        logger.error(f"Backup failed: {e}")
        return ""


def get_backup_list() -> list:
    """List existing backups."""
    BACKUP_DIR.mkdir(exist_ok=True)
    backups = []
    for f in sorted(BACKUP_DIR.glob("aura_*.db"), key=lambda p: p.stat().st_mtime, reverse=True):
        backups.append({
            "filename": f.name,
            "size_kb": round(f.stat().st_size / 1024, 1),
            "created_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
        })
    return backups
