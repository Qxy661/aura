from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.research import Article
from app.models.wealth import Holding
from app.models.muse import Note, Quote

router = APIRouter(
    prefix="/api/search",
    tags=["search"],
)


@router.get("")
def global_search(
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Cross-module search using SQLite LIKE — zero LLM cost."""
    pattern = f"%{q}%"
    results = []

    # Articles
    articles = (
        db.query(Article)
        .filter(
            or_(
                Article.title.ilike(pattern),
                Article.abstract.ilike(pattern),
                Article.authors.ilike(pattern),
                Article.summary.ilike(pattern),
            )
        )
        .order_by(Article.fetched_at.desc())
        .limit(limit)
        .all()
    )
    for a in articles:
        results.append({
            "type": "article",
            "module": "research",
            "id": a.id,
            "title": a.title,
            "subtitle": a.authors[:60] if a.authors else (a.summary or "")[:60],
            "created_at": str(a.fetched_at) if a.fetched_at else "",
        })

    # Holdings
    holdings = (
        db.query(Holding)
        .filter(or_(Holding.name.ilike(pattern), Holding.code.ilike(pattern)))
        .order_by(Holding.created_at.desc())
        .limit(limit)
        .all()
    )
    for h in holdings:
        results.append({
            "type": "holding",
            "module": "wealth",
            "id": h.id,
            "title": h.name,
            "subtitle": f"{h.code} · {h.asset_type}",
            "created_at": str(h.created_at) if h.created_at else "",
        })

    # Notes
    notes = (
        db.query(Note)
        .filter(Note.content.ilike(pattern))
        .order_by(Note.created_at.desc())
        .limit(limit)
        .all()
    )
    for n in notes:
        results.append({
            "type": "note",
            "module": "muse",
            "id": n.id,
            "title": n.content[:50],
            "subtitle": f"心情: {n.mood}" if n.mood else "",
            "created_at": str(n.created_at) if n.created_at else "",
        })

    # Quotes
    quotes = (
        db.query(Quote)
        .filter(or_(Quote.content.ilike(pattern), Quote.author.ilike(pattern)))
        .order_by(Quote.id.desc())
        .limit(limit)
        .all()
    )
    for qt in quotes:
        results.append({
            "type": "quote",
            "module": "muse",
            "id": qt.id,
            "title": qt.content[:50],
            "subtitle": qt.author or "佚名",
            "created_at": "",
        })

    # Sort all by created_at desc, then limit
    results.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    results = results[:limit]

    return {"results": results, "total": len(results)}
