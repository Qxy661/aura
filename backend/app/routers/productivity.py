from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import case
from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.productivity import SmartTodo, DailyBrief

router = APIRouter(
    prefix="/api/productivity",
    tags=["productivity"],
)


class TodoCreate(BaseModel):
    content: str
    category: Optional[str] = "general"


class TodoUpdate(BaseModel):
    is_done: Optional[bool] = None
    content: Optional[str] = None
    parsed_title: Optional[str] = None
    parsed_deadline: Optional[str] = None
    parsed_priority: Optional[int] = None


# --- Todos ---

@router.get("/todos")
def list_todos(db: Session = Depends(get_db)):
    """List todos: incomplete first, then by priority and deadline."""
    todos = (
        db.query(SmartTodo)
        .order_by(
            SmartTodo.is_done.asc(),
            SmartTodo.parsed_priority.asc(),
            SmartTodo.parsed_deadline.asc().nullslast(),
            SmartTodo.created_at.desc(),
        )
        .all()
    )
    return [
        {
            "id": t.id,
            "content": t.content,
            "parsed_title": t.parsed_title or t.content,
            "parsed_deadline": t.parsed_deadline or "",
            "parsed_priority": t.parsed_priority,
            "category": t.category,
            "is_done": t.is_done,
            "created_at": str(t.created_at) if t.created_at else "",
            "completed_at": str(t.completed_at) if t.completed_at else "",
        }
        for t in todos
    ]


@router.post("/todos")
def create_todo(data: TodoCreate, db: Session = Depends(get_db)):
    """Create a todo — uses LLM to parse natural language input."""
    from app.services.llm_service import parse_todo

    parsed = parse_todo(data.content)
    todo = SmartTodo(
        content=data.content,
        parsed_title=parsed.get("title", data.content),
        parsed_deadline=parsed.get("deadline", ""),
        parsed_priority=parsed.get("priority", 2),
        category=data.category or "general",
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return {
        "id": todo.id,
        "content": todo.content,
        "parsed_title": todo.parsed_title,
        "parsed_deadline": todo.parsed_deadline,
        "parsed_priority": todo.parsed_priority,
        "category": todo.category,
        "is_done": todo.is_done,
        "created_at": str(todo.created_at) if todo.created_at else "",
    }


@router.patch("/todos/{todo_id}")
def update_todo(todo_id: int, data: TodoUpdate, db: Session = Depends(get_db)):
    """Update a todo (mark done, edit content, etc.)."""
    todo = db.query(SmartTodo).filter(SmartTodo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    if data.is_done is not None:
        todo.is_done = data.is_done
        if data.is_done:
            todo.completed_at = datetime.utcnow()
        else:
            todo.completed_at = None
    if data.content is not None:
        todo.content = data.content
    if data.parsed_title is not None:
        todo.parsed_title = data.parsed_title
    if data.parsed_deadline is not None:
        todo.parsed_deadline = data.parsed_deadline
    if data.parsed_priority is not None:
        todo.parsed_priority = data.parsed_priority

    db.commit()
    db.refresh(todo)
    return {
        "id": todo.id,
        "content": todo.content,
        "parsed_title": todo.parsed_title,
        "parsed_deadline": todo.parsed_deadline,
        "parsed_priority": todo.parsed_priority,
        "category": todo.category,
        "is_done": todo.is_done,
        "created_at": str(todo.created_at) if todo.created_at else "",
        "completed_at": str(todo.completed_at) if todo.completed_at else "",
    }


@router.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = db.query(SmartTodo).filter(SmartTodo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()
    return {"ok": True}


# --- Daily Brief ---

@router.get("/brief/today")
def get_today_brief(db: Session = Depends(get_db)):
    """Get today's research brief. Cached in DB — generates only once per day."""
    today_str = date.today().isoformat()

    # Check cache
    brief = db.query(DailyBrief).filter(DailyBrief.date == today_str).first()
    if brief:
        return {
            "date": brief.date,
            "content": brief.content,
            "article_count": brief.article_count,
            "cached": True,
        }

    # Generate new brief
    from app.models.research import Article
    from app.models.wealth import Holding

    today_dt = datetime.combine(date.today(), datetime.min.time())
    articles = (
        db.query(Article)
        .filter(Article.fetched_at >= today_dt)
        .order_by(Article.relevance_score.desc())
        .limit(10)
        .all()
    )

    holdings = db.query(Holding).all()

    article_data = [
        {"title": a.title, "summary": a.summary or a.abstract[:100]}
        for a in articles
    ]
    holding_data = [
        {"name": h.name, "code": h.code}
        for h in holdings
    ]

    from app.services.llm_service import generate_daily_brief
    content = generate_daily_brief(article_data, holding_data)

    brief = DailyBrief(
        date=today_str,
        content=content,
        article_count=len(articles),
    )
    db.add(brief)
    db.commit()
    db.refresh(brief)

    return {
        "date": brief.date,
        "content": brief.content,
        "article_count": brief.article_count,
        "cached": False,
    }


# --- Daily Review ---

@router.post("/daily-review")
def generate_daily_review_endpoint(db: Session = Depends(get_db)):
    """Generate cross-module daily review: papers + holdings + notes + todos."""
    from app.models.research import Article
    from app.models.wealth import Holding
    from app.models.muse import Note, MoodRecord
    from app.services.llm_service import generate_daily_review
    from datetime import datetime, timedelta

    today = datetime.combine(date.today(), datetime.min.time())

    articles = (
        db.query(Article)
        .filter(Article.fetched_at >= today)
        .order_by(Article.relevance_score.desc())
        .limit(5)
        .all()
    )
    article_data = [{"title": a.title, "summary": (a.summary or "")[:100]} for a in articles]

    holdings = db.query(Holding).all()
    holding_data = [
        {"name": h.name, "code": h.code, "cost_price": h.cost_price, "shares": h.shares}
        for h in holdings
    ]

    notes = (
        db.query(Note)
        .filter(Note.created_at >= today)
        .order_by(Note.created_at.desc())
        .limit(5)
        .all()
    )
    note_data = [{"content": n.content, "mood": n.mood or ""} for n in notes]

    # Fetch recent mood records for cross-module correlation
    moods = (
        db.query(MoodRecord)
        .order_by(MoodRecord.date.desc())
        .limit(7)
        .all()
    )
    mood_data = [{"mood": m.mood, "intensity": m.intensity or 3, "date": str(m.date)} for m in moods]

    todos = (
        db.query(SmartTodo)
        .order_by(SmartTodo.is_done.asc(), SmartTodo.parsed_priority.asc())
        .limit(10)
        .all()
    )
    todo_data = [
        {
            "content": t.content,
            "parsed_title": t.parsed_title or t.content,
            "is_done": t.is_done,
        }
        for t in todos
    ]

    try:
        review = generate_daily_review(article_data, holding_data, note_data, todo_data, mood_data)
        return {"review": review, "date": date.today().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Daily review failed: {str(e)}")
