from datetime import datetime
from sqlalchemy.orm import Session
from app.models.research import Article


def export_articles_markdown(db: Session, folder: str = None, saved_only: bool = False) -> str:
    """Export articles as Markdown for Notion import."""
    query = db.query(Article)
    if folder:
        query = query.filter(Article.folder == folder)
    if saved_only:
        query = query.filter(Article.is_saved == True)

    articles = query.order_by(Article.fetched_at.desc()).all()

    lines = [
        f"# Aura 科研文章导出",
        f"",
        f"> 导出时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}  ",
        f"> 共 {len(articles)} 篇文章",
        f"",
        "---",
        "",
    ]

    # Group by folder
    folders: dict[str, list] = {}
    for a in articles:
        key = a.folder or "未分类"
        folders.setdefault(key, []).append(a)

    for folder_name, items in folders.items():
        lines.append(f"## {folder_name}")
        lines.append("")
        for a in items:
            status = "⭐" if a.is_saved else ""
            tags_str = f" `{a.tags}`" if a.tags else ""
            score_str = f" (相关度: {a.relevance_score}/10)" if a.relevance_score > 0 else ""
            lines.append(f"### {status} {a.title}{tags_str}{score_str}")
            lines.append("")
            if a.authors:
                lines.append(f"**作者**: {a.authors}  ")
            if a.source:
                lines.append(f"**来源**: {a.source}  ")
            if a.published_at:
                lines.append(f"**发表日期**: {a.published_at.strftime('%Y-%m-%d')}  ")
            lines.append(f"**链接**: [{a.url}]({a.url})  ")
            lines.append("")
            if a.summary:
                lines.append(f"**AI 摘要**: {a.summary}")
                lines.append("")
            if a.key_points:
                lines.append(f"**核心要点**: {a.key_points}")
                lines.append("")
            if a.abstract:
                lines.append(f"<details><summary>摘要原文</summary>")
                lines.append("")
                lines.append(a.abstract[:1000])
                lines.append("")
                lines.append("</details>")
                lines.append("")
            if a.notes:
                lines.append(f"**笔记**: {a.notes}")
                lines.append("")
            lines.append("---")
            lines.append("")

    return "\n".join(lines)
