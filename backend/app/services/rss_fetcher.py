import feedparser
import httpx
import logging
from sqlalchemy.orm import Session
from datetime import datetime
from app.config import get_settings
from app.models.research import Article

logger = logging.getLogger(__name__)


def fetch_rss(db: Session) -> int:
    """Fetch articles from configured RSS feeds. Returns count of new articles."""
    feeds = [f.strip() for f in get_settings().rss_feeds.split(",") if f.strip()]
    if not feeds:
        return 0

    new_count = 0
    for feed_url in feeds:
        if not feed_url.startswith("http"):
            continue

        try:
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                resp = client.get(feed_url)
                resp.raise_for_status()
        except Exception as e:
            logger.warning(f"RSS feed {feed_url} fetch failed: {e}")
            continue

        feed = feedparser.parse(resp.text)
        if feed.bozo and not feed.entries:
            logger.warning(f"RSS feed {feed_url} parse error: {feed.bozo_exception}")
            continue

        entries = feed.entries[:20]
        if not entries:
            continue

        # Batch dedup
        urls_in_batch = [e.get("link", "") for e in entries if e.get("link")]
        existing_urls = set()
        if urls_in_batch:
            for (url,) in db.query(Article.url).filter(Article.url.in_(urls_in_batch)).all():
                existing_urls.add(url)

        for entry in entries:
            try:
                url = entry.get("link", "")
                if not url or url in existing_urls:
                    continue

                title = entry.get("title", "Untitled")
                abstract = entry.get("summary", entry.get("description", ""))
                published = entry.get("published_parsed")

                published_at = None
                if published and len(published) >= 6:
                    try:
                        published_at = datetime(*published[:6])
                    except (ValueError, TypeError):
                        pass

                article = Article(
                    title=title,
                    url=url,
                    source="rss",
                    authors=entry.get("author", ""),
                    abstract=abstract,
                    published_at=published_at,
                )
                db.add(article)
                db.commit()
                new_count += 1
            except Exception as e:
                db.rollback()
                logger.warning(f"Failed to process RSS entry: {e}")
                continue

    return new_count
