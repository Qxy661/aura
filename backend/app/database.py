from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # SQLite specific
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import research, wealth, muse  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # SQLite migration: add new columns if they don't exist
    from sqlalchemy import text
    with engine.connect() as conn:
        for col_def in [
            "book_title TEXT DEFAULT ''",
            "ai_summary TEXT DEFAULT ''",
            "ai_analysis TEXT DEFAULT ''",
        ]:
            try:
                conn.execute(text(f"ALTER TABLE quotes ADD COLUMN {col_def}"))
                conn.commit()
            except Exception:
                pass  # Column already exists

        for col_def in [
            "folder TEXT DEFAULT ''",
            "user_relevance_score REAL DEFAULT 0.0",
            "paper_chat_history TEXT DEFAULT ''",
        ]:
            try:
                conn.execute(text(f"ALTER TABLE articles ADD COLUMN {col_def}"))
                conn.commit()
            except Exception:
                pass  # Column already exists

        # Create price_history table if not exists
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                holding_id INTEGER NOT NULL REFERENCES holdings(id),
                price REAL NOT NULL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()

    # Seed research fields
    from app.services.research_fields_seed import seed_research_fields
    seed_research_fields()
