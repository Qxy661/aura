from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
import random
from app.database import get_db
from app.models.muse import Quote, Note, MoodRecord
from app.schemas.muse import (
    QuoteCreate, QuoteOut, NoteCreate, NoteOut,
    MoodRecordCreate, MoodRecordOut, TarotCard,
)
from app.services.llm_service import generate_quotes, generate_mood_advice

router = APIRouter(prefix="/api/muse", tags=["muse"])


# --- Quotes ---
@router.get("/quotes/today", response_model=list[QuoteOut])
def get_today_quotes(db: Session = Depends(get_db)):
    """Get 3 random quotes for today. Fetch new ones if none exist for today."""
    today = date.today()
    quotes = db.query(Quote).filter(Quote.shown_date == today).all()
    if not quotes:
        # Fetch new quotes and pick 3
        from app.services.quote_fetcher import fetch_quotes
        fetch_quotes(db)
        all_quotes = db.query(Quote).filter(Quote.shown_date == None).all()
        if all_quotes:
            selected = random.sample(all_quotes, min(3, len(all_quotes)))
            for q in selected:
                q.shown_date = today
            db.commit()
            quotes = selected
    return quotes


@router.get("/quotes", response_model=list[QuoteOut])
def list_quotes(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Quote).order_by(Quote.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/quotes", response_model=QuoteOut)
def create_quote(data: QuoteCreate, db: Session = Depends(get_db)):
    quote = Quote(**data.model_dump())
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


# --- Notes ---
@router.get("/notes", response_model=list[NoteOut])
def list_notes(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Note).order_by(Note.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/notes", response_model=NoteOut)
def create_note(data: NoteCreate, db: Session = Depends(get_db)):
    note = Note(**data.model_dump())
    db.add(note)
    # Also create a mood record
    if data.mood and data.mood != "neutral":
        mood_record = MoodRecord(
            mood=data.mood,
            date=date.today(),
            note=data.content[:100],
        )
        db.add(mood_record)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"ok": True}


# --- Mood ---
@router.get("/mood/heatmap", response_model=list[MoodRecordOut])
def get_mood_heatmap(days: int = 30, db: Session = Depends(get_db)):
    """Get mood records for heatmap display."""
    since = date.today() - timedelta(days=days)
    return (
        db.query(MoodRecord)
        .filter(MoodRecord.date >= since)
        .order_by(MoodRecord.date.desc())
        .all()
    )


@router.post("/mood", response_model=MoodRecordOut)
def create_mood_record(data: MoodRecordCreate, db: Session = Depends(get_db)):
    record = MoodRecord(mood=data.mood, note=data.note, date=date.today())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# --- Quote Analysis ---
@router.post("/quotes/{quote_id}/analyze", response_model=QuoteOut)
def analyze_quote_endpoint(quote_id: int, db: Session = Depends(get_db)):
    """Generate AI analysis for a specific quote."""
    from app.services.llm_service import analyze_quote

    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    try:
        result = analyze_quote(quote.content, quote.author, quote.book_title or "")
        quote.ai_summary = result.get("summary", "")
        quote.ai_analysis = result.get("analysis", "")
        db.commit()
        db.refresh(quote)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    return quote


# --- Tarot ---
@router.get("/tarot", response_model=TarotCard)
def draw_tarot():
    """Draw a random tarot card."""
    from app.services.tarot import draw_card
    return draw_card()


# --- AI Generate Quotes ---
@router.post("/quotes/generate")
def auto_generate_quotes(count: int = 3, db: Session = Depends(get_db)):
    """Use LLM to generate new book quotes and save to database."""
    try:
        quotes_data = generate_quotes(count)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")

    saved = []
    for qd in quotes_data:
        if not qd.get("content"):
            continue
        quote = Quote(
            content=qd["content"],
            author=qd.get("author", ""),
            book_title=qd.get("book_title", ""),
        )
        db.add(quote)
        saved.append(quote)
    db.commit()
    for q in saved:
        db.refresh(q)
    return {"generated": len(saved), "quotes": [QuoteOut.model_validate(q) for q in saved]}


# --- AI Mood Care ---
@router.get("/mood/advice")
def get_mood_advice(db: Session = Depends(get_db)):
    """Get AI-generated caring advice based on recent mood records."""
    recent = (
        db.query(MoodRecord)
        .order_by(MoodRecord.date.desc())
        .limit(7)
        .all()
    )
    if not recent:
        return {"mood": "neutral", "advice": "🐶 还没有心情记录哦，写下第一条闪念，让小狗更懂你~"}

    current_mood = recent[0].mood
    recent_moods = [r.mood for r in recent]
    try:
        advice = generate_mood_advice(current_mood, recent_moods)
    except Exception as e:
        advice = "🐶 汪！小狗暂时想不出建议，但一直在这里陪你~"
    return {"mood": current_mood, "advice": advice}
