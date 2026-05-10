import { useState } from "react";
import { api } from "@/lib/api";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

export function DailyBriefCard() {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [briefDate, setBriefDate] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.post<{ brief: string; date: string }>("/wealth/daily-brief");
      setBrief(res.brief);
      setBriefDate(res.date);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-[var(--color-primary)]" />
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">AI 每日简报</p>
        </div>
        {brief && (
          <button
            onClick={generate}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
            title="重新生成"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : "text-[var(--color-muted-foreground)]"} />
          </button>
        )}
      </div>

      <p className="text-[10px] text-[var(--color-muted-foreground)]">
        综合分析你的持仓、研究论文、闪念笔记、待办事项，生成个性化的每日简报
      </p>

      {brief ? (
        <div className="fade-in-up">
          {briefDate && (
            <p className="text-[9px] text-[var(--color-muted-foreground)] mb-2">{briefDate}</p>
          )}
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#FFF8E1] to-[#FFE4B5]">
            <MarkdownRenderer content={brief} />
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-3">
          <p className="text-xs text-[var(--color-muted-foreground)]">生成失败，请稍后重试</p>
          <button onClick={generate} className="btn-soft text-[10px] px-3 py-1.5 mt-2">
            重试
          </button>
        </div>
      ) : (
        <button
          onClick={generate}
          disabled={loading}
          className="btn-primary w-full text-xs flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <>
              <Loader2 size={12} className="animate-spin" /> 小狗正在分析中...
            </>
          ) : (
            <>
              <Sparkles size={12} /> 生成今日简报
            </>
          )}
        </button>
      )}
    </div>
  );
}
