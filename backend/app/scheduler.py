import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal

logger = logging.getLogger(__name__)


def _daily_fetch():
    """Daily article fetch at 8am."""
    db = SessionLocal()
    try:
        from app.services.research_fields_seed import seed_research_fields
        from app.services.arxiv_fetcher import fetch_arxiv
        from app.services.rss_fetcher import fetch_rss
        from app.models.research import ResearchField

        active = db.query(ResearchField).filter(ResearchField.is_active == True).first()
        keywords = active.keywords if active else None

        try:
            count = fetch_arxiv(db, keywords_override=keywords)
            logger.info(f"Daily fetch: {count} new arXiv articles")
        except Exception as e:
            logger.warning(f"Daily arXiv fetch failed: {e}")

        try:
            count = fetch_rss(db)
            logger.info(f"Daily fetch: {count} new RSS articles")
        except Exception as e:
            logger.warning(f"Daily RSS fetch failed: {e}")
    finally:
        db.close()


def _daily_quotes():
    """Generate daily quotes at 7am."""
    db = SessionLocal()
    try:
        from app.services.llm_service import generate_quotes
        from app.models.muse import Quote
        from datetime import date

        # Check if today already has quotes
        today = date.today()
        existing = db.query(Quote).filter(Quote.shown_date == today).count()
        if existing >= 3:
            return

        try:
            quotes_data = generate_quotes(3)
            for qd in quotes_data:
                if qd.get("content"):
                    quote = Quote(
                        content=qd["content"],
                        author=qd.get("author", ""),
                        book_title=qd.get("book_title", ""),
                        shown_date=today,
                    )
                    db.add(quote)
            db.commit()
            logger.info(f"Generated {len(quotes_data)} daily quotes")
        except Exception as e:
            logger.warning(f"Daily quotes generation failed: {e}")
    finally:
        db.close()


def _daily_backup():
    """Daily database backup at 2am."""
    try:
        from app.services.backup import backup_database
        path = backup_database()
        if path:
            logger.info(f"Daily backup completed: {path}")
    except Exception as e:
        logger.warning(f"Daily backup failed: {e}")


def _weekly_report():
    """Weekly investment report on Mondays at 9am."""
    db = SessionLocal()
    try:
        from app.services.llm_service import generate_investment_report
        from app.models.wealth import Holding, Insight, WeeklyReport
        from datetime import datetime, timedelta

        holdings = db.query(Holding).all()
        if not holdings:
            return

        week_ago = datetime.utcnow() - timedelta(days=7)
        insights = db.query(Insight).filter(Insight.created_at >= week_ago).all()

        try:
            report_text = generate_investment_report(holdings, insights)
            report = WeeklyReport(
                report_content=report_text,
                period_start=week_ago,
                period_end=datetime.utcnow(),
            )
            db.add(report)
            db.commit()
            logger.info("Weekly report generated")
        except Exception as e:
            logger.warning(f"Weekly report generation failed: {e}")
    finally:
        db.close()


def _keepalive_ping():
    """Ping self to prevent Render free tier from sleeping."""
    import os
    import httpx
    port = os.environ.get("PORT", "8000")
    try:
        resp = httpx.get(f"http://127.0.0.1:{port}/health", timeout=10)
        if resp.status_code == 200:
            logger.debug("Keep-alive ping OK")
    except Exception as e:
        logger.debug(f"Keep-alive ping failed: {e}")


def setup_scheduler() -> BackgroundScheduler:
    """Configure and start the background scheduler."""
    scheduler = BackgroundScheduler()

    # Daily article fetch at 8:00 AM
    scheduler.add_job(_daily_fetch, "cron", hour=8, minute=0, id="daily_fetch")

    # Daily quotes generation at 7:00 AM
    scheduler.add_job(_daily_quotes, "cron", hour=7, minute=0, id="daily_quotes")

    # Daily backup at 2:00 AM
    scheduler.add_job(_daily_backup, "cron", hour=2, minute=0, id="daily_backup")

    # Weekly report on Monday at 9:00 AM
    scheduler.add_job(_weekly_report, "cron", day_of_week="mon", hour=9, minute=0, id="weekly_report")

    # Keep-alive ping every 14 minutes (Render sleeps after 15min idle)
    scheduler.add_job(_keepalive_ping, "interval", minutes=14, id="keepalive")

    scheduler.start()
    logger.info("Scheduler started: daily_fetch@08:00, daily_quotes@07:00, daily_backup@02:00, weekly_report@Mon 09:00, keepalive@14min")
    return scheduler
