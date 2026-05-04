"""Semantic Scholar paper fetcher — free API, no key required."""
import logging
import httpx
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.research import Article

logger = logging.getLogger(__name__)

API_BASE = "https://api.semanticscholar.org/graph/v1"
SEARCH_URL = f"{API_BASE}/paper/search"
FIELDS = "title,abstract,authors,url,year,publicationDate,citationCount,externalIds"


def fetch_semantic_scholar(db: Session, keywords: str = "", limit: int = 20) -> int:
    """Fetch papers from Semantic Scholar. Returns count of new papers."""
    if not keywords:
        keywords = "deep learning,computer vision"

    # Take first keyword group for search
    query = keywords.split(",")[0].strip()
    if len(query) > 200:
        query = query[:200]

    try:
        resp = httpx.get(
            SEARCH_URL,
            params={
                "query": query,
                "limit": min(limit, 50),
                "fields": FIELDS,
            },
            timeout=30.0,
            follow_redirects=True,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning(f"Semantic Scholar fetch failed: {e}")
        return 0

    papers = data.get("data", [])
    if not papers:
        logger.info("Semantic Scholar: no papers found")
        return 0

    count = 0
    for paper in papers:
        title = paper.get("title", "").strip()
        if not title:
            continue

        # Build URL from external IDs or fallback
        ext_ids = paper.get("externalIds", {}) or {}
        arxiv_id = ext_ids.get("ArXiv")
        doi = ext_ids.get("DOI")
        if arxiv_id:
            url = f"https://arxiv.org/abs/{arxiv_id}"
        elif doi:
            url = f"https://doi.org/{doi}"
        else:
            url = paper.get("url", "") or f"https://www.semanticscholar.org/paper/{paper.get('paperId', '')}"

        # Skip if already exists
        existing = db.query(Article).filter(Article.url == url).first()
        if existing:
            continue

        authors_list = paper.get("authors", []) or []
        authors = ", ".join(a.get("name", "") for a in authors_list[:5])

        abstract = paper.get("abstract", "") or ""
        pub_date = paper.get("publicationDate")
        published_at = None
        if pub_date:
            try:
                published_at = datetime.fromisoformat(pub_date)
            except (ValueError, TypeError):
                pass

        article = Article(
            title=title,
            url=url,
            source="semantic_scholar",
            authors=authors,
            abstract=abstract,
            published_at=published_at,
        )
        db.add(article)
        count += 1

    if count > 0:
        db.commit()
        logger.info(f"Semantic Scholar: added {count} new papers")

    return count
