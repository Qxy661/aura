import { useState } from "react";
import { api } from "@/lib/api";
import { CalendarDays, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export function DailyReviewCard() {
  const [review, setReview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ review: string; date: string }>("/productivity/daily-review");
      setReview(res.review);
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
          <CalendarDays size={14} className="text-[var(--color-primary)]" />
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">每日复盘</p>
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
            {review ? "重新生成" : "生成今日复盘"}
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
