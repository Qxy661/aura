import { useState } from "react";
import { api } from "@/lib/api";
import { Scale, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export function RebalanceCard() {
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ suggestions: string; total: number }>("/wealth/rebalance");
      setSuggestions(res.suggestions);
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
          <Scale size={14} className="text-[var(--color-primary)]" />
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">智能再平衡</p>
        </div>
        <div className="flex items-center gap-1">
          {suggestions && (
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
            {suggestions ? "重新分析" : "AI 分析"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[10px] text-red-500">{error}</p>
      )}

      {suggestions && expanded && (
        <div className="p-3 rounded-xl bg-[var(--color-muted)] text-xs leading-relaxed whitespace-pre-wrap fade-in-up">
          {suggestions}
        </div>
      )}
    </div>
  );
}
