import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Insight {
  id: number;
  content: string;
  source: string;
  tags: string;
  created_at: string;
}

interface InsightPanelProps {
  insights: Insight[];
  onRefresh: () => void;
  onError: (msg: string) => void;
}

export function InsightPanel({ insights, onRefresh, onError }: InsightPanelProps) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const add = async () => {
    if (!text.trim()) return;
    try {
      await api.post("/wealth/insights", { content: text, source });
      setText("");
      setSource("");
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "添加失败");
    }
  };

  const deleteInsight = async (id: number) => {
    try {
      await api.del(`/wealth/insights/${id}`);
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "删除失败");
    }
  };

  return (
    <div className="space-y-3">
      <div className="cute-card p-4 space-y-3">
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">💬 记录一个市场观点</p>
        <textarea
          placeholder="在小红书、雪球看到的好观点，粘贴到这里..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="cute-input resize-none"
        />
        <div className="flex gap-2">
          <input
            placeholder="来源 (可选)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="cute-input flex-1"
          />
          <button onClick={add} className="btn-primary px-4">
            <Send size={14} />
          </button>
        </div>
      </div>
      {insights.length === 0 ? (
        <div className="cute-card p-8 text-center">
          <div className="text-4xl mb-3">💭</div>
          <p className="text-sm text-[var(--color-muted-foreground)] font-medium">还没有收集观点</p>
        </div>
      ) : (
        insights.map((ins, i) => (
          <div key={ins.id} className="cute-card p-4 fade-in-up group relative" style={{ animationDelay: `${i * 0.05}s` }}>
            <button
              onClick={() => setDeleteId(ins.id)}
              className="absolute top-3 right-3 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-muted)] transition-all"
            >
              <Trash2 size={12} className="text-[var(--color-destructive)]" />
            </button>
            <p className="text-sm leading-relaxed">{ins.content}</p>
            {ins.source && (
              <p className="text-[11px] text-[var(--color-muted-foreground)] mt-2">📌 来源: {ins.source}</p>
            )}
          </div>
        ))
      )}

      {deleteId !== null && (
        <ConfirmDialog
          title="删除观点"
          message="确定要删除这条市场观点吗？"
          confirmLabel="删除"
          destructive
          onConfirm={() => { deleteInsight(deleteId); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
