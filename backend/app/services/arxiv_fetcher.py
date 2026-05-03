import arxiv
import logging
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models.research import Article

logger = logging.getLogger(__name__)


def fetch_arxiv(db: Session, max_results: int = 20, keywords_override: str = None) -> int:
    """Fetch articles from arXiv based on configured keywords. Returns count of new articles."""
    if keywords_override:
        keywords = [k.strip() for k in keywords_override.split(",") if k.strip()]
    else:
        keywords = [k.strip() for k in get_settings().arxiv_keywords.split(",") if k.strip()]
    if not keywords:
        return 0

    query = " OR ".join(f"all:{kw}" for kw in keywords)

    try:
        client = arxiv.Client()
        search = arxiv.Search(
            query=query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.SubmittedDate,
            sort_order=arxiv.SortOrder.Descending,
        )
        results = list(client.results(search))
    except Exception as e:
        logger.warning(f"arXiv fetch failed: {e}")
        raise RuntimeError(f"arXiv 请求失败: {str(e)}")

    if not results:
        return 0

    # Batch dedup: fetch all existing URLs in one query
    urls_in_batch = [r.entry_id for r in results if r.entry_id]
    existing_urls = set()
    if urls_in_batch:
        for (url,) in db.query(Article.url).filter(Article.url.in_(urls_in_batch)).all():
            existing_urls.add(url)

    new_count = 0
    for result in results:
        try:
            url = result.entry_id
            if not url or url in existing_urls:
                continue

            title = result.title.strip().replace("\n", " ") if result.title else "Untitled"
            abstract = result.summary.strip().replace("\n", " ") if result.summary else ""
            authors = ", ".join(a.name for a in result.authors if a.name) if result.authors else ""

            published_at = None
            if result.published:
                published_at = result.published.replace(tzinfo=None)

            article = Article(
                title=title,
                url=url,
                source="arxiv",
                authors=authors,
                abstract=abstract,
                published_at=published_at,
            )
            db.add(article)
            db.commit()
            new_count += 1
        except Exception as e:
            db.rollback()
            logger.warning(f"Failed to process arXiv entry: {e}")
            continue

    return new_count
