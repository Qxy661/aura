import { useState } from "react";
import { Send, Trash2, PenLine, Check, X } from "lucide-react";
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

function friendlyTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

const SOURCE_FILTERS = [
  { key: null, label: "全部" },
  { key: "小红书", label: "小红书" },
  { key: "雪球", label: "雪球" },
  { key: "微博", label: "微博" },
];

export function InsightPanel({ insights, onRefresh, onError }: InsightPanelProps) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSource, setEditSource] = useState("");

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

  const startEdit = (ins: Insight) => {
    setEditingId(ins.id);
    setEditContent(ins.content);
    setEditSource(ins.source || "");
  };

  const saveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      await api.patch(`/wealth/insights/${editingId}`, {
        content: editContent,
        source: editSource,
      });
      setEditingId(null);
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新失败");
    }
  };

  const filtered = filterSource
    ? insights.filter((i) => i.source === filterSource)
    : insights;

  return (
    <div className="space-y-3">
      {/* Input card */}
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

      {/* Source filter */}
      {insights.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {SOURCE_FILTERS.map((f) => (
            <button
              key={f.key ?? "all"}
              onClick={() => setFilterSource(f.key)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                filterSource === f.key
                  ? "border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                  : "border-transparent bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Insights list */}
      {filtered.length === 0 ? (
        <div className="cute-card p-8 text-center">
          <div className="text-4xl mb-3">💭</div>
          <p className="text-sm text-[var(--color-muted-foreground)] font-medium">
            {insights.length === 0 ? "还没有收集观点" : "该来源暂无观点"}
          </p>
          <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1">
            看到好的市场分析，随手记录下来
          </p>
        </div>
      ) : (
        filtered.map((ins, i) => (
          <div
            key={ins.id}
            className="cute-card p-4 fade-in-up group relative"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {editingId === ins.id ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={2}
                  className="cute-input resize-none text-xs w-full"
                />
                <input
                  placeholder="来源"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  className="cute-input text-xs w-full"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors">
                    <X size={14} className="text-[var(--color-muted-foreground)]" />
                  </button>
                  <button onClick={saveEdit} className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors">
                    <Check size={14} className="text-green-600" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => startEdit(ins)}
                    className="p-1 rounded hover:bg-[var(--color-muted)]"
                  >
                    <PenLine size={12} className="text-[var(--color-muted-foreground)]" />
                  </button>
                  <button
                    onClick={() => setDeleteId(ins.id)}
                    className="p-1 rounded hover:bg-[var(--color-muted)]"
                  >
                    <Trash2 size={12} className="text-[var(--color-destructive)]" />
                  </button>
                </div>
                <p className="text-sm leading-relaxed pr-14">{ins.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  {ins.source && (
                    <span className="tag text-[9px]">{ins.source}</span>
                  )}
                  <span className="text-[10px] text-[var(--color-muted-foreground)]">
                    {friendlyTime(ins.created_at)}
                  </span>
                </div>
              </>
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
          onConfirm={() => {
            deleteInsight(deleteId);
            setDeleteId(null);
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
