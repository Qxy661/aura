import { useState } from "react";
import { api } from "@/lib/api";
import { BookOpen, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  folder?: string;
}

export function LiteratureReviewCard({ folder }: Props) {
  const [review, setReview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [articleCount, setArticleCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = folder ? `?folder=${encodeURIComponent(folder)}` : "";
      const res = await api.post<{ review: string; article_count: number }>(
        `/research/literature-review${params}`
      );
      setReview(res.review);
      setArticleCount(res.article_count);
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[var(--color-primary)]" />
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">文献综述</p>
          {articleCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
              {articleCount} 篇
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {review && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-soft text-[10px] px-2.5 py-1.5 flex items-center gap-1"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : null}
            {review ? "重新生成" : "AI 生成综述"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[10px] text-red-500">{error}</p>
      )}

      {review && expanded && (
        <div className="p-3 rounded-xl bg-[var(--color-muted)] text-xs leading-relaxed whitespace-pre-wrap fade-in-up">
          {review}
        </div>
      )}
    </div>
  );
}
