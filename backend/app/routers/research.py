from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db, SessionLocal
from app.models.research import Article, ResearchField, PaperRelation
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
    min_user_score: float = 0.0,
    sort_by: str = "fetched_at",
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
    if min_user_score > 0:
        query = query.filter(Article.user_relevance_score >= min_user_score)
    total = query.count()

    # Sorting
    if sort_by == "relevance_score":
        order = Article.relevance_score.desc()
    elif sort_by == "user_relevance_score":
        order = Article.user_relevance_score.desc()
    else:
        order = Article.fetched_at.desc()

    articles = query.order_by(order).offset(skip).limit(limit).all()
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


class ChatMessage(BaseModel):
    message: str
    history: list = []


@router.post("/articles/smart-filter")
def smart_filter(limit: int = 30, db: Session = Depends(get_db)):
    """Evaluate user relevance for articles that haven't been scored yet."""
    from app.services.llm_service import evaluate_user_relevance

    # Get active research field as user profile
    active = db.query(ResearchField).filter(ResearchField.is_active == True).first()
    profile = active.keywords if active else "AI, machine learning, deep learning"

    articles = db.query(Article).filter(
        Article.user_relevance_score == 0.0,
        Article.summary != "",
    ).limit(limit).all()

    if not articles:
        return {"evaluated": 0, "message": "没有需要评估的文章"}

    try:
        results = evaluate_user_relevance(articles, profile)
        updated = 0
        for item in results:
            aid = item.get("id")
            score = item.get("score", 0)
            if aid:
                art = db.query(Article).filter(Article.id == aid).first()
                if art:
                    art.user_relevance_score = float(score)
                    updated += 1
        db.commit()
        return {"evaluated": updated, "total_scored": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart filter failed: {str(e)}")


@router.get("/network")
def get_paper_network(limit: int = 50, db: Session = Depends(get_db)):
    """Return paper relationship graph data (nodes + edges)."""
    articles = db.query(Article).filter(Article.summary != "").order_by(
        Article.user_relevance_score.desc()
    ).limit(limit).all()

    nodes = [
        {
            "id": a.id,
            "title": a.title[:60],
            "score": a.relevance_score,
            "user_score": a.user_relevance_score,
            "source": a.source,
        }
        for a in articles
    ]

    relations = db.query(PaperRelation).filter(
        PaperRelation.source_id.in_([a.id for a in articles]),
    ).all()

    edges = [
        {
            "source": r.source_id,
            "target": r.target_id,
            "type": r.relation_type,
            "strength": r.strength,
        }
        for r in relations
    ]

    return {"nodes": nodes, "edges": edges}


@router.post("/articles/{article_id}/fetch-fulltext")
def fetch_fulltext(article_id: int, db: Session = Depends(get_db)):
    """Download and extract full text from paper PDF."""
    from app.services.pdf_service import fetch_and_extract_full_text

    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if article.full_text:
        return {"ok": True, "chars": len(article.full_text), "cached": True}

    text = fetch_and_extract_full_text(article.url)
    if not text:
        raise HTTPException(status_code=400, detail="无法提取全文（可能不是 arxiv 论文或 PDF 无法访问）")

    article.full_text = text
    db.commit()
    return {"ok": True, "chars": len(text), "cached": False}


@router.post("/articles/{article_id}/chat")
def chat_with_article(article_id: int, body: ChatMessage, db: Session = Depends(get_db)):
    """Chat with a paper — ask questions about it."""
    from app.services.llm_service import chat_with_paper

    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    try:
        reply = chat_with_paper(
            title=article.title,
            abstract=article.abstract,
            summary=article.summary,
            full_text=article.full_text or "",
            message=body.message,
            history=body.history,
        )

        # Save chat history
        import json
        history = []
        if article.paper_chat_history:
            try:
                history = json.loads(article.paper_chat_history)
            except Exception:
                pass
        history.append({"role": "user", "content": body.message})
        history.append({"role": "assistant", "content": reply})
        article.paper_chat_history = json.dumps(history[-20:])  # keep last 20 messages
        db.commit()

        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.post("/network/build")
def build_network(limit: int = 30, db: Session = Depends(get_db)):
    """Build paper relationships using AI analysis."""
    from app.services.llm_service import find_paper_connections

    articles = db.query(Article).filter(Article.summary != "").order_by(
        Article.fetched_at.desc()
    ).limit(limit).all()

    if len(articles) < 2:
        return {"relations": 0, "message": "Not enough articles"}

    try:
        connections = find_paper_connections(articles)
        # Clear old relations for these articles
        article_ids = [a.id for a in articles]
        db.query(PaperRelation).filter(
            PaperRelation.source_id.in_(article_ids)
        ).delete(synchronize_session=False)

        added = 0
        for conn in connections:
            sid = conn.get("source_id")
            tid = conn.get("target_id")
            if sid and tid and sid != tid:
                rel = PaperRelation(
                    source_id=sid,
                    target_id=tid,
                    relation_type=conn.get("type", "topic"),
                    strength=float(conn.get("strength", 0.5)),
                )
                db.add(rel)
                added += 1
        db.commit()
        return {"relations": added}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Build network failed: {str(e)}")


@router.get("/suggestions")
def get_suggestions(db: Session = Depends(get_db)):
    """Get AI research suggestions based on collected papers."""
    from app.services.llm_service import generate_research_suggestions

    active = db.query(ResearchField).filter(ResearchField.is_active == True).first()
    profile = active.keywords if active else "AI, machine learning, deep learning"

    articles = db.query(Article).filter(Article.summary != "").order_by(
        Article.fetched_at.desc()
    ).limit(20).all()

    if not articles:
        return {"suggestions": [], "trends": "暂无论文数据", "priority": []}

    try:
        result = generate_research_suggestions(articles, profile)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggestions failed: {str(e)}")
