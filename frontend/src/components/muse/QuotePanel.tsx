import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { SwipeableCards } from "@/components/muse/SwipeableCards";
import { FlipCard } from "@/components/muse/FlipCard";
import { TodoInput } from "@/components/productivity/TodoInput";
import { TodoList } from "@/components/productivity/TodoList";
import { DailyReviewCard } from "@/components/productivity/DailyReviewCard";
import { scheduleTodoReminder } from "@/lib/notifications";
import { Shuffle, Plus, Wand2, Loader2 } from "lucide-react";

interface Quote {
  id: number;
  content: string;
  author: string;
  book_title: string;
  ai_summary: string;
  ai_analysis: string;
}

interface TodoItem {
  id: number;
  content: string;
  parsed_title: string;
  parsed_deadline: string;
  parsed_priority: number;
  category: string;
  is_done: boolean;
}

interface QuotePanelProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onInfo: (msg: string) => void;
}

export function QuotePanel({ onSuccess, onError, onInfo }: QuotePanelProps) {
  const { data: quotes, refetch: refetchQuotes } = useApi<Quote[]>(
    () => api.get("/muse/quotes/today")
  );
  const { data: todos, refetch: refetchTodos } = useApi<TodoItem[]>(
    () => api.get("/productivity/todos")
  );

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ content: "", author: "", book_title: "" });
  const [generating, setGenerating] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState<Set<number>>(new Set());
  const [analysisResults, setAnalysisResults] = useState<Record<number, { ai_summary: string; ai_analysis: string }>>({});

  const addQuote = async () => {
    if (!quoteForm.content.trim()) return;
    try {
      await api.post("/muse/quotes", quoteForm);
      setQuoteForm({ content: "", author: "", book_title: "" });
      setShowQuoteForm(false);
      onSuccess("书摘已添加");
      refetchQuotes();
    } catch (e) {
      onError(e instanceof Error ? e.message : "添加失败");
    }
  };

  const handleAnalyzeQuote = async (quoteId: number) => {
    const q = quotes?.find((q) => q.id === quoteId);
    if (!q || q.ai_summary || analyzingIds.has(quoteId) || analysisResults[quoteId]) return;

    setAnalyzingIds((prev) => new Set(prev).add(quoteId));
    try {
      const result = await api.post<{ ai_summary: string; ai_analysis: string }>(`/muse/quotes/${quoteId}/analyze`);
      setAnalysisResults((prev) => ({ ...prev, [quoteId]: result }));
    } catch {
      onError("AI 解读失败，点击可重试");
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(quoteId);
        return next;
      });
    }
  };

  const handleGenerateQuotes = async () => {
    setGenerating(true);
    try {
      const result = await api.post<{ generated: number }>("/muse/quotes/generate?count=3");
      refetchQuotes();
      if (result.generated > 0) {
        onSuccess(`生成了 ${result.generated} 条新书摘`);
      } else {
        onInfo("暂时没有新书摘，稍后再试");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleAddTodo = async (content: string) => {
    try {
      const result = await api.post<{ id: number; parsed_title: string; parsed_deadline: string }>("/productivity/todos", { content });
      onSuccess("待办已添加");
      if (result.parsed_deadline) {
        scheduleTodoReminder(result.parsed_title || content, result.parsed_deadline);
      }
      refetchTodos();
    } catch (e) {
      onError(e instanceof Error ? e.message : "添加失败");
    }
  };

  const handleToggleTodo = async (id: number, isDone: boolean) => {
    try {
      await api.patch(`/productivity/todos/${id}`, { is_done: isDone });
      refetchTodos();
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新失败");
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await api.del(`/productivity/todos/${id}`);
      onSuccess("待办已删除");
      refetchTodos();
    } catch (e) {
      onError(e instanceof Error ? e.message : "删除失败");
    }
  };

  return (
    <div className="space-y-4">
      {/* Smart Todos */}
      <div className="cute-card p-4 space-y-3">
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">✅ 今日待办</p>
        <TodoInput onAdd={handleAddTodo} />
        <TodoList
          todos={todos ?? []}
          onToggle={handleToggleTodo}
          onDelete={handleDeleteTodo}
        />
      </div>

      {/* Daily Review */}
      <DailyReviewCard />

      {/* Daily Quotes */}
      <div className="cute-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">📖 今日书摘盲盒</p>
          <div className="flex items-center gap-1">
            <button
              onClick={handleGenerateQuotes}
              disabled={generating}
              className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
              title="AI 生成书摘"
            >
              <Wand2 size={14} className={generating ? "animate-spin text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"} />
            </button>
            <button
              onClick={() => setShowQuoteForm(!showQuoteForm)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
              title="手动添加书摘"
            >
              <Plus size={14} className="text-[var(--color-muted-foreground)]" />
            </button>
            <button
              onClick={() => refetchQuotes()}
              className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
              title="换一批"
            >
              <Shuffle size={14} className="text-[var(--color-muted-foreground)]" />
            </button>
          </div>
        </div>

        {showQuoteForm && (
          <div className="p-3 rounded-xl bg-[var(--color-muted)] space-y-2 fade-in-up">
            <textarea
              placeholder="粘贴书摘内容..."
              value={quoteForm.content}
              onChange={(e) => setQuoteForm({ ...quoteForm, content: e.target.value })}
              rows={3}
              className="cute-input resize-none text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="作者"
                value={quoteForm.author}
                onChange={(e) => setQuoteForm({ ...quoteForm, author: e.target.value })}
                className="cute-input text-xs"
              />
              <input
                placeholder="书名"
                value={quoteForm.book_title}
                onChange={(e) => setQuoteForm({ ...quoteForm, book_title: e.target.value })}
                className="cute-input text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowQuoteForm(false)} className="flex-1 btn-soft text-xs py-2">取消</button>
              <button onClick={addQuote} className="flex-1 btn-primary text-xs py-2">添加</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {quotes && quotes.length > 0 ? (
            <SwipeableCards
              items={quotes}
              renderItem={(item) => {
                const q = item as Quote;
                const extra = analysisResults[q.id];
                const isAnalyzing = analyzingIds.has(q.id);
                const summary = q.ai_summary || extra?.ai_summary || "";
                const analysis = q.ai_analysis || extra?.ai_analysis || "";

                return (
                  <FlipCard
                    onFlipToBack={() => handleAnalyzeQuote(q.id)}
                    front={
                      <div className="relative p-5 rounded-2xl bg-gradient-to-br from-[var(--color-muted)] to-[var(--color-cream)] border border-[var(--color-border)] min-h-[220px]">
                        {q.book_title && (
                          <span className="tag text-[10px] mb-2 inline-flex">📖 {q.book_title}</span>
                        )}
                        <div className="absolute top-3 left-4 text-4xl opacity-10 select-none">"</div>
                        <p className="text-sm leading-relaxed pl-4 italic text-[var(--color-foreground)] mt-4">
                          {q.content}
                        </p>
                        <p className="text-[11px] text-[var(--color-muted-foreground)] font-semibold mt-3 pl-4">
                          — {q.author || "佚名"}
                        </p>
                        <p className="text-[9px] text-[var(--color-muted-foreground)] text-center mt-4 opacity-60">
                          点击翻转查看 AI 解读 →
                        </p>
                      </div>
                    }
                    back={
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-muted)] border border-[var(--color-border)] min-h-[220px] space-y-3">
                        <p className="text-xs font-bold text-[var(--color-accent-foreground)]">💡 AI 解读</p>
                        {isAnalyzing ? (
                          <div className="flex items-center gap-2 py-4">
                            <Loader2 size={14} className="animate-spin text-[var(--color-primary)]" />
                            <span className="text-xs text-[var(--color-muted-foreground)]">AI 正在解读...</span>
                          </div>
                        ) : summary ? (
                          <>
                            <p className="text-xs text-[var(--color-foreground)] leading-relaxed">{summary}</p>
                            {analysis && (
                              <div className="pt-2 border-t border-[var(--color-border)]">
                                <p className="text-xs text-[var(--color-foreground)] leading-relaxed whitespace-pre-wrap">
                                  {analysis}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-[var(--color-muted-foreground)] py-4">翻转时自动加载 AI 解读</p>
                        )}
                      </div>
                    }
                  />
                );
              }}
            />
          ) : (
            <div className="text-center py-6">
              <div className="text-3xl puppy-bounce inline-block">📖</div>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-2">加载书摘中...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
