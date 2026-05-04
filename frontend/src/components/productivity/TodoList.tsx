import { Trash2, CheckCircle, Circle, Calendar } from "lucide-react";

interface TodoItem {
  id: number;
  content: string;
  parsed_title: string;
  parsed_deadline: string;
  parsed_priority: number;
  category: string;
  is_done: boolean;
}

interface TodoListProps {
  todos: TodoItem[];
  onToggle: (id: number, isDone: boolean) => void;
  onDelete: (id: number) => void;
}

const PRIORITY_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-600",
  2: "bg-amber-100 text-amber-600",
  3: "bg-gray-100 text-gray-500",
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "紧急",
  2: "普通",
  3: "低",
};

function formatDeadline(d: string): string {
  if (!d) return "";
  try {
    const date = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "今天";
    if (diff === 1) return "明天";
    if (diff === -1) return "昨天";
    if (diff > 0 && diff <= 7) return `${diff}天后`;
    if (diff < 0 && diff >= -7) return `${-diff}天前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return d;
  }
}

export function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="text-xs text-[var(--color-muted-foreground)] text-center py-4">
        暂无待办，输入自然语言添加
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2 p-2.5 rounded-xl transition-all ${
            t.is_done ? "opacity-50" : "bg-[var(--color-muted)]"
          }`}
        >
          <button
            onClick={() => onToggle(t.id, !t.is_done)}
            className="mt-0.5 shrink-0"
          >
            {t.is_done ? (
              <CheckCircle size={16} className="text-[var(--color-primary)]" />
            ) : (
              <Circle size={16} className="text-[var(--color-muted-foreground)]" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${t.is_done ? "line-through" : ""}`}>
              {t.parsed_title || t.content}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${PRIORITY_COLORS[t.parsed_priority] || PRIORITY_COLORS[2]}`}>
                {PRIORITY_LABELS[t.parsed_priority] || "普通"}
              </span>
              {t.parsed_deadline && (
                <span className="flex items-center gap-0.5 text-[9px] text-[var(--color-muted-foreground)]">
                  <Calendar size={9} /> {formatDeadline(t.parsed_deadline)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => onDelete(t.id)}
            className="p-1 rounded-lg hover:bg-[var(--color-background)] transition-colors shrink-0"
          >
            <Trash2 size={12} className="text-[var(--color-destructive)]" />
          </button>
        </div>
      ))}
    </div>
  );
}
