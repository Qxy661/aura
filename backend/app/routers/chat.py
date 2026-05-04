"""Global AI Chat — cross-module Q&A about user's data."""
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
def global_chat(
    data: dict = Body(...),
    db: Session = Depends(get_db),
):
    """Answer any question about the user's data across all modules."""
    from app.services.llm_service import get_client, get_effective_llm_config, _parse_json_response

    message = data.get("message", "").strip()
    if not message:
        return {"reply": "请输入你的问题。"}

    # Gather context from all modules
    context_parts = []

    # Research
    try:
        from app.models.research import Article
        articles = (
            db.query(Article)
            .order_by(Article.fetched_at.desc())
            .limit(10)
            .all()
        )
        if articles:
            articles_text = "\n".join(
                f"- [{a.source}] {a.title} (相关性:{a.relevance_score:.1f})"
                for a in articles
            )
            context_parts.append(f"【最近论文】\n{articles_text}")
    except Exception:
        pass

    # Wealth
    try:
        from app.models.wealth import Holding
        holdings = db.query(Holding).all()
        if holdings:
            holdings_text = "\n".join(
                f"- {h.name}({h.code}): 成本{h.cost_price}, 份额{h.shares}, 类型{h.asset_type}"
                for h in holdings
            )
            context_parts.append(f"【持仓】\n{holdings_text}")
    except Exception:
        pass

    # Notes
    try:
        from app.models.muse import Note
        notes = (
            db.query(Note)
            .order_by(Note.created_at.desc())
            .limit(5)
            .all()
        )
        if notes:
            notes_text = "\n".join(
                f"- [{n.mood or ''}] {n.content[:60]}" for n in notes
            )
            context_parts.append(f"【最近闪念】\n{notes_text}")
    except Exception:
        pass

    # Todos
    try:
        from app.models.productivity import SmartTodo
        todos = (
            db.query(SmartTodo)
            .filter(SmartTodo.is_done == False)
            .order_by(SmartTodo.parsed_priority.asc())
            .limit(10)
            .all()
        )
        if todos:
            todos_text = "\n".join(
                f"- {'[紧急]' if t.parsed_priority == 1 else ''}{t.parsed_title or t.content}"
                for t in todos
            )
            context_parts.append(f"【待办】\n{todos_text}")
    except Exception:
        pass

    # Quotes
    try:
        from app.models.muse import Quote
        quotes = db.query(Quote).order_by(Quote.id.desc()).limit(3).all()
        if quotes:
            quotes_text = "\n".join(
                f"- \"{q.content[:50]}\" — {q.author or '佚名'}"
                for q in quotes
            )
            context_parts.append(f"【书摘】\n{quotes_text}")
    except Exception:
        pass

    context = "\n\n".join(context_parts) or "暂无数据。"

    response = get_client().chat.completions.create(
        model=get_effective_llm_config()["model"],
        messages=[
            {
                "role": "system",
                "content": (
                    "你是 Aura，用户的个人 AI 助手。你了解用户的所有数据：论文、持仓、闪念、待办、书摘。\n"
                    "根据用户的问题和上下文数据，给出有帮助的回答。\n"
                    "要求：\n"
                    "1. 回答要基于实际数据，不要编造\n"
                    "2. 如果数据中没有相关信息，诚实说明\n"
                    "3. 语气温暖专业，用中文\n"
                    "4. 简洁有力，不超过200字"
                ),
            },
            {
                "role": "user",
                "content": f"用户数据：\n{context}\n\n用户问：{message}",
            },
        ],
        temperature=0.5,
        max_tokens=500,
        extra_body={"reasoning_effort": "low"},
    )

    reply = response.choices[0].message.content or "抱歉，我暂时无法回答这个问题。"
    return {"reply": reply}
