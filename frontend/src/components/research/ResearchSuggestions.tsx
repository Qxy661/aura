import { useState } from "react";
import { Lightbulb, TrendingUp, Star, Loader2, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

interface Suggestions {
  suggestions: string[];
  trends: string;
  priority: { id: number; reason: string }[];
}

interface ResearchSuggestionsProps {
  onGoToArticle?: (id: number) => void;
}

export function ResearchSuggestions({ onGoToArticle }: ResearchSuggestionsProps) {
  const [data, setData] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    try {
      const res = await api.get<Suggestions>("/research/suggestions");
      setData(res);
      setExpanded(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--color-muted-foreground)] flex items-center gap-1.5">
          💡 AI 科研建议
        </p>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="btn-soft text-[10px] px-2.5 py-1 flex items-center gap-1"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />}
          {data ? "刷新" : "生成建议"}
        </button>
      </div>

      {data && expanded && (
        <div className="space-y-3 fade-in-up">
          {/* Trends */}
          {data.trends && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#FFF8E1] to-[#FFE4B5]">
              <p className="text-[10px] font-bold text-[var(--color-accent-foreground)] mb-1 flex items-center gap-1">
                <TrendingUp size={11} /> 研究趋势
              </p>
              <p className="text-xs leading-relaxed">{data.trends}</p>
            </div>
          )}

          {/* Suggestions */}
          {data.suggestions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[var(--color-muted-foreground)] mb-1.5">研究方向建议</p>
              <div className="space-y-1.5">
                {data.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-[var(--color-primary)] font-bold mt-0.5">{i + 1}.</span>
                    <span className="text-[var(--color-foreground)] leading-relaxed">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priority reading */}
          {data.priority.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[var(--color-muted-foreground)] mb-1.5 flex items-center gap-1">
                <Star size={11} /> 优先阅读
              </p>
              <div className="space-y-1.5">
                {data.priority.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => onGoToArticle?.(p.id)}
                    className="flex items-start gap-2 text-xs w-full text-left hover:bg-[var(--color-muted)] rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <span className="text-[var(--color-primary)]">⭐</span>
                    <span className="text-[var(--color-accent-foreground)] leading-relaxed">
                      {p.reason}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {data && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-[10px] text-[var(--color-accent-foreground)]"
        >
          <ChevronDown size={10} /> 展开建议
        </button>
      )}
    </div>
  );
}
