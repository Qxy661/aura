from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database import get_db, SessionLocal
from app.models.research import Article, ResearchField
from app.schemas.research import (
    ArticleOut, ArticleUpdate, ArticleListOut,
    ResearchFieldOut, ResearchFieldUpdate,
)

router = APIRouter(
    prefix="/api/research",
    tags=["research"],
    responses={404: {"description": "Not found"}},
)


# --- Research Fields ---
@router.get("/fields", response_model=list[ResearchFieldOut])
def list_fields(db: Session = Depends(get_db)):
    return db.query(ResearchField).order_by(ResearchField.sort_order).all()


@router.patch("/fields/{field_id}", response_model=ResearchFieldOut)
def update_field(field_id: int, data: ResearchFieldUpdate, db: Session = Depends(get_db)):
    field = db.query(ResearchField).filter(ResearchField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    # Single-select: deactivate all others first
    if data.is_active:
        db.query(ResearchField).filter(ResearchField.id != field_id).update({"is_active": False})
    field.is_active = data.is_active
    db.commit()
    db.refresh(field)
    return field


# --- Articles ---
@router.get("/articles", response_model=ArticleListOut)
def list_articles(
    saved_only: bool = False,
    source: Optional[str] = None,
    folder: Optional[str] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    min_score: float = 0.0,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Article)
    if saved_only:
        query = query.filter(Article.is_saved == True)
    if source:
        query = query.filter(Article.source == source)
    if folder:
        query = query.filter(Article.folder == folder)
    if tag:
        query = query.filter(Article.tags.contains(tag))
    if q:
        query = query.filter(
            (Article.title.contains(q)) | (Article.abstract.contains(q)) | (Article.authors.contains(q))
        )
    if min_score > 0:
        query = query.filter(Article.relevance_score >= min_score)
    total = query.count()
    articles = query.order_by(Article.fetched_at.desc()).offset(skip).limit(limit).all()
    return ArticleListOut(articles=articles, total=total)


@router.get("/folders")
def list_folders(db: Session = Depends(get_db)):
    """Get distinct folder names used in articles."""
    rows = db.query(Article.folder).filter(Article.folder != "").distinct().all()
    return [r[0] for r in rows]


@router.get("/tags")
def list_tags(db: Session = Depends(get_db)):
    """Get distinct tags used in articles."""
    rows = db.query(Article.tags).filter(Article.tags != "").all()
    tag_set = set()
    for (tags_str,) in rows:
        for t in tags_str.split(","):
            t = t.strip()
            if t:
                tag_set.add(t)
    return sorted(tag_set)


@router.get("/export/markdown")
def export_markdown(
    folder: Optional[str] = None,
    saved_only: bool = False,
    db: Session = Depends(get_db),
):
    """Export articles as Markdown file for Notion import."""
    from fastapi.responses import Response
    from app.services.notion_export import export_articles_markdown

    md = export_articles_markdown(db, folder=folder, saved_only=saved_only)
    filename = f"aura_articles_{datetime.now().strftime('%Y%m%d')}.md"
    return Response(
        content=md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/articles/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.patch("/articles/{article_id}", response_model=ArticleOut)
def update_article(article_id: int, data: ArticleUpdate, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(article, field, value)
    db.commit()
    db.refresh(article)
    return article


@router.post("/articles/{article_id}/summarize", response_model=ArticleOut)
def summarize_article(article_id: int, db: Session = Depends(get_db)):
    """Trigger AI summarization for a specific article."""
    from app.services.llm_service import summarize_text

    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    try:
        result = summarize_text(article.abstract or article.title)
        article.summary = result["summary"]
        article.key_points = result["key_points"]
        article.relevance_score = result["relevance_score"]
        db.commit()
        db.refresh(article)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")
    return article


@router.post("/fetch")
def trigger_fetch(
    background_tasks: BackgroundTasks,
    field_id: Optional[int] = None,
    auto_summarize: bool = True,
    db: Session = Depends(get_db),
):
    """Manually trigger article fetching. Uses selected field's keywords if available."""
    from app.services.arxiv_fetcher import fetch_arxiv
    from app.services.rss_fetcher import fetch_rss

    # Determine keywords from field
    keywords_override = None
    if field_id:
        field = db.query(ResearchField).filter(ResearchField.id == field_id).first()
        if field:
            keywords_override = field.keywords
    else:
        active = db.query(ResearchField).filter(ResearchField.is_active == True).first()
        if active:
            keywords_override = active.keywords

    results = {"arxiv": 0, "rss": 0}
    try:
        results["arxiv"] = fetch_arxiv(db, keywords_override=keywords_override)
    except Exception as e:
        results["arxiv_error"] = str(e)
    try:
        results["rss"] = fetch_rss(db)
    except Exception as e:
        results["rss_error"] = str(e)

    # Auto-summarize new articles in background
    if auto_summarize and results["arxiv"] > 0:
        background_tasks.add_task(_batch_summarize_new)

    return results


def _batch_summarize_new():
    """Background task: summarize articles that have no summary yet."""
    import logging
    logger = logging.getLogger(__name__)
    db = SessionLocal()
    try:
        from app.services.llm_service import summarize_text
        articles = db.query(Article).filter(Article.summary == "").limit(10).all()
        for article in articles:
            try:
                result = summarize_text(article.abstract or article.title)
                article.summary = result.get("summary", "")
                article.key_points = result.get("key_points", "")
                article.relevance_score = result.get("relevance_score", 0)
                db.commit()
                logger.info(f"Auto-summarized: {article.title[:50]}")
            except Exception as e:
                db.rollback()
                logger.warning(f"Auto-summary failed for article {article.id}: {e}")
    finally:
        db.close()


@router.post("/articles/batch-summarize")
def batch_summarize(limit: int = 10, db: Session = Depends(get_db)):
    """Summarize articles that have no AI summary yet."""
    from app.services.llm_service import summarize_text

    articles = db.query(Article).filter(Article.summary == "").limit(limit).all()
    summarized = 0
    errors = 0
    for article in articles:
        try:
            result = summarize_text(article.abstract or article.title)
            article.summary = result.get("summary", "")
            article.key_points = result.get("key_points", "")
            article.relevance_score = result.get("relevance_score", 0)
            db.commit()
            summarized += 1
        except Exception as e:
            db.rollback()
            errors += 1
    return {"summarized": summarized, "errors": errors, "remaining": db.query(Article).filter(Article.summary == "").count()}
