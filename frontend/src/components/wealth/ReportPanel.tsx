import { useState } from "react";
import { FileText } from "lucide-react";
import { api } from "@/lib/api";

interface Report {
  id: number;
  report_content: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

interface ReportPanelProps {
  reports: Report[];
  onRefresh: () => void;
  onError: (msg: string) => void;
}

export function ReportPanel({ reports, onRefresh, onError }: ReportPanelProps) {
  const [generating, setGenerating] = useState(false);

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
      <button
        onClick={generate}
        disabled={generating}
        className="btn-primary w-full text-xs flex items-center justify-center gap-1.5"
      >
        <FileText size={14} />
        {generating ? "🐶 小狗正在分析中..." : "生成本周复盘报告"}
      </button>
      {reports.length === 0 ? (
        <div className="cute-card p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm text-[var(--color-muted-foreground)] font-medium">添加持仓后，点击上方按钮生成复盘</p>
        </div>
      ) : (
        reports.map((r, i) => (
          <div key={r.id} className="cute-card p-4 fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="tag text-[10px]">📅</span>
              <span className="text-[11px] text-[var(--color-muted-foreground)] font-medium">
                {new Date(r.period_start).toLocaleDateString()} - {new Date(r.period_end).toLocaleDateString()}
              </span>
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-[var(--color-foreground)]">
              {r.report_content}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
