import { useState } from "react";
import { FileText, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

interface Report {
  id: number;
  report_content: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

interface DailySummary {
  date: string;
  summary: string;
  net_inflow_count: number;
  net_outflow_count: number;
  total_net_flow: number;
  created_at: string;
}

interface ReportPanelProps {
  reports: Report[];
  onRefresh: () => void;
  onError: (msg: string) => void;
}

export function ReportPanel({ reports, onRefresh, onError }: ReportPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [showReports, setShowReports] = useState(true);
  const [showSummaries, setShowSummaries] = useState(true);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);

  const { data: dailySummaries } = useApi<DailySummary[]>(
    () => api.get("/wealth/sector-flow/daily-summaries?limit=7")
  );

  const generate = async () => {
    setGenerating(true);
    try {
      await api.post("/wealth/reports/generate");
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "报告生成失败");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Daily Market Summaries Section */}
      <div className="cute-card p-4 space-y-3">
        <button
          onClick={() => setShowSummaries(!showSummaries)}
          className="flex items-center gap-1 w-full"
        >
          <Clock size={12} className="text-[var(--color-accent-foreground)]" />
          <span className="text-[11px] font-bold text-[var(--color-accent-foreground)] flex-1 text-left">
            收盘总结
          </span>
          {showSummaries ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {showSummaries && (
          <div className="space-y-2">
            {dailySummaries && dailySummaries.length > 0 ? (
              dailySummaries.map((s) => (
                <div
                  key={s.date}
                  className="p-3 rounded-xl bg-[var(--color-muted)] cursor-pointer hover:bg-[var(--color-accent)] transition-colors"
                  onClick={() =>
                    setExpandedSummary(expandedSummary === s.date ? null : s.date)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold">{s.date}</span>
                      <span className="text-[9px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded-full">
                        +{s.net_inflow_count}流入
                      </span>
                      <span className="text-[9px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded-full">
                        -{s.net_outflow_count}流出
                      </span>
                    </div>
                    {expandedSummary === s.date ? (
                      <ChevronUp size={10} />
                    ) : (
                      <ChevronDown size={10} />
                    )}
                  </div>
                  {expandedSummary === s.date && s.summary && (
                    <div className="mt-2 pt-2 border-t border-[var(--color-border)] text-[11px] leading-relaxed whitespace-pre-line text-[var(--color-foreground)]">
                      {s.summary}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-[11px] text-[var(--color-muted-foreground)] text-center py-2">
                暂无收盘总结（每个交易日15:30自动生成）
              </p>
            )}
          </div>
        )}
      </div>

      {/* Weekly Reports Section */}
      <div className="cute-card p-4 space-y-3">
        <button
          onClick={() => setShowReports(!showReports)}
          className="flex items-center gap-1 w-full"
        >
          <FileText size={12} className="text-[var(--color-accent-foreground)]" />
          <span className="text-[11px] font-bold text-[var(--color-accent-foreground)] flex-1 text-left">
            AI 周报
          </span>
          {showReports ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {showReports && (
          <div className="space-y-2">
            <button
              onClick={generate}
              disabled={generating}
              className="btn-primary w-full text-xs flex items-center justify-center gap-1.5"
            >
              {generating ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> 小狗正在分析中...
                </>
              ) : (
                <>
                  <FileText size={12} /> 生成本周复盘报告
                </>
              )}
            </button>

            {reports.length === 0 ? (
              <p className="text-[11px] text-[var(--color-muted-foreground)] text-center py-2">
                添加持仓后，点击上方按钮生成复盘
              </p>
            ) : (
              reports.map((r, i) => (
                <div
                  key={r.id}
                  className="p-3 rounded-xl bg-[var(--color-muted)] fade-in-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="tag text-[9px]">📅</span>
                    <span className="text-[10px] text-[var(--color-muted-foreground)] font-medium">
                      {new Date(r.period_start).toLocaleDateString()} -{" "}
                      {new Date(r.period_end).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[11px] whitespace-pre-wrap leading-relaxed text-[var(--color-foreground)]">
                    {r.report_content}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
