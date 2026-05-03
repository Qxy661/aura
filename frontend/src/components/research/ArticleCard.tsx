import { useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, ChevronDown, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface Article {
  id: number;
  title: string;
  url: string;
  source: string;
  authors: string;
  abstract: string;
  summary: string;
  key_points: string;
  relevance_score: number;
  is_saved: boolean;
  tags: string;
  notes: string;
  published_at: string | null;
  fetched_at: string;
}

interface ArticleCardProps {
  article: Article;
  index: number;
  onToggleSave: () => void;
}

export function ArticleCard({ article, index, onToggleSave }: ArticleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [localSummary, setLocalSummary] = useState(article.summary);
  const [localKeyPoints, setLocalKeyPoints] = useState(article.key_points);
  const [localScore, setLocalScore] = useState(article.relevance_score);

  const toggleSave = async () => {
    await api.patch(`/research/articles/${article.id}`, { is_saved: !article.is_saved });
    onToggleSave();
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const result = await api.post<{ summary: string; key_points: string; relevance_score: number }>(
        `/research/articles/${article.id}/summarize`
      );
      setLocalSummary(result.summary);
      setLocalKeyPoints(result.key_points);
      setLocalScore(result.relevance_score);
    } catch (e) {
      // Error will be shown by parent
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div
      className="cute-card p-4 fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="tag text-[10px]">
          {article.source === "arxiv" ? "📄" : "📰"} {article.source}
        </span>
        {localScore > 0 && (
          <span className="tag text-[10px]">⭐ {localScore.toFixed(1)}</span>
        )}
        {article.is_saved && <span className="tag tag-primary text-[10px]">❤️ 已收藏</span>}
      </div>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-bold text-[var(--color-foreground)] hover:text-[var(--color-accent-foreground)] transition-colors leading-snug line-clamp-2"
      >
        {article.title}
        <ExternalLink size={11} className="inline ml-1 opacity-40" />
      </a>
      {/* Article URL */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-[var(--color-accent-foreground)] hover:underline truncate block mt-0.5"
      >
        🔗 {article.url}
      </a>
      {article.authors && (
        <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1 truncate">
          ✍️ {article.authors}
        </p>
      )}
      {localSummary ? (
        <div className="mt-2 bg-[var(--color-muted)] rounded-lg px-3 py-2">
          <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            💡 {localSummary}
          </p>
          {localKeyPoints && (
            <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1.5 leading-relaxed">
              🎯 {localKeyPoints}
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-muted)] hover:bg-[var(--color-accent)] transition-all text-[var(--color-accent-foreground)]"
        >
          <Sparkles size={12} className={summarizing ? "animate-spin" : ""} />
          {summarizing ? "AI 分析中..." : "AI 一键摘要"}
        </button>
      )}
      {article.abstract && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] text-[var(--color-accent-foreground)] mt-2 font-semibold"
        >
          <ChevronDown
            size={12}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          {expanded ? "收起摘要" : "展开摘要"}
        </button>
      )}
      {expanded && (
        <p className="text-xs text-[var(--color-muted-foreground)] mt-2 leading-relaxed">
          {article.abstract}
        </p>
      )}
      <div className="flex items-center justify-end mt-3 pt-2 border-t border-[var(--color-border)]">
        <button
          onClick={toggleSave}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-all"
        >
          {article.is_saved ? (
            <>
              <BookmarkCheck size={13} className="text-[var(--color-primary)]" />
              <span className="text-[var(--color-primary)]">已收藏</span>
            </>
          ) : (
            <>
              <Bookmark size={13} className="text-[var(--color-muted-foreground)]" />
              <span className="text-[var(--color-muted-foreground)]">收藏</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
