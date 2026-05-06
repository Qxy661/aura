import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { PuppyMascot } from "@/components/ui/PuppyMascot";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SwipeableCards } from "@/components/muse/SwipeableCards";
import { FlipCard } from "@/components/muse/FlipCard";
import { MoodRainbow } from "@/components/muse/MoodRainbow";
import { MoodTrend } from "@/components/muse/MoodTrend";
import { TarotSection } from "@/components/muse/TarotSection";
import { TodoInput } from "@/components/productivity/TodoInput";
import { TodoList } from "@/components/productivity/TodoList";
import { DailyReviewCard } from "@/components/productivity/DailyReviewCard";
import { VoiceInput } from "@/components/ui/VoiceInput";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { scheduleTodoReminder } from "@/lib/notifications";
import { Shuffle, PenLine, Trash2, Plus, Sparkles, Wand2, Loader2, Check, X, Search, Tag } from "lucide-react";

interface Quote {
  id: number;
  content: string;
  author: string;
  book_title: string;
  ai_summary: string;
  ai_analysis: string;
}

interface Note {
  id: number;
  content: string;
  quote_id: number | null;
  mood: string;
  tags: string;
  created_at: string;
}

interface MoodRecord {
  id: number;
  mood: string;
  date: string;
  note: string;
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

const MOODS = [
  { key: "happy", label: "开心", emoji: "😊", color: "#F5C842" },
  { key: "calm", label: "平静", emoji: "😌", color: "#6BBF59" },
  { key: "inspired", label: "灵感", emoji: "✨", color: "#F5A623" },
  { key: "sad", label: "emo", emoji: "😢", color: "#7BAFD4" },
  { key: "anxious", label: "焦虑", emoji: "😰", color: "#E85D4A" },
];

export default function MusePage() {
  const { showSuccess, showError, showInfo, ToastContainer } = useToast();
  const { data: quotes, refetch: refetchQuotes } = useApi<Quote[]>(
    () => api.get("/muse/quotes/today")
  );
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);

  const fetchNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterTag) params.set("tag", filterTag);
      const qs = params.toString();
      const result = await api.get<Note[]>(`/muse/notes${qs ? "?" + qs : ""}`);
      setNotes(result);
    } catch {
      // ignore
    } finally {
      setNotesLoading(false);
    }
  }, [searchQuery, filterTag]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    api.get<{ tags: string[] }>("/muse/notes/tags").then((res) => setAllTags(res.tags)).catch(() => {});
  }, []);
  const { data: moodData } = useApi<MoodRecord[]>(
    () => api.get("/muse/mood/heatmap?days=30")
  );
  const { data: moodAdvice, refetch: refetchAdvice } = useApi<{ mood: string; advice: string }>(
    () => api.get("/muse/mood/advice")
  );
  const { data: todos, refetch: refetchTodos } = useApi<TodoItem[]>(
    () => api.get("/productivity/todos")
  );

  const [noteText, setNoteText] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [selectedMood, setSelectedMood] = useState("neutral");
  const [moodIntensity, setMoodIntensity] = useState(3);
  const [relatedQuoteId, setRelatedQuoteId] = useState<number | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState("neutral");
  const [editTags, setEditTags] = useState("");
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ content: "", author: "", book_title: "" });
  const [generating, setGenerating] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState<Set<number>>(new Set());
  const [analysisResults, setAnalysisResults] = useState<Record<number, { ai_summary: string; ai_analysis: string }>>({});

  const deleteNote = async (id: number) => {
    try {
      await api.del(`/muse/notes/${id}`);
      showSuccess("已删除");
      fetchNotes();
    } catch (e) {
      showError(e instanceof Error ? e.message : "删除失败");
    }
  };

  const startEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditMood(note.mood);
    setEditTags(note.tags || "");
  };

  const saveEditNote = async () => {
    if (!editingNoteId || !editContent.trim()) return;
    try {
      await api.patch(`/muse/notes/${editingNoteId}`, {
        content: editContent,
        mood: editMood,
        tags: editTags,
      });
      setEditingNoteId(null);
      showSuccess("已更新");
      fetchNotes();
    } catch (e) {
      showError(e instanceof Error ? e.message : "更新失败");
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      await api.post("/muse/notes", {
        content: noteText,
        mood: selectedMood,
        intensity: moodIntensity,
        quote_id: relatedQuoteId,
        tags: noteTags,
      });
      setNoteText("");
      setNoteTags("");
      setSelectedMood("neutral");
      setMoodIntensity(3);
      setRelatedQuoteId(null);
      setShowNoteInput(false);
      showSuccess("灵感已记录");
      fetchNotes();
    } catch (e) {
      showError(e instanceof Error ? e.message : "记录失败");
    }
  };

  const addQuote = async () => {
    if (!quoteForm.content.trim()) return;
    try {
      await api.post("/muse/quotes", quoteForm);
      setQuoteForm({ content: "", author: "", book_title: "" });
      setShowQuoteForm(false);
      showSuccess("书摘已添加");
      refetchQuotes();
    } catch (e) {
      showError(e instanceof Error ? e.message : "添加失败");
    }
  };

  const handleAnalyzeQuote = async (quoteId: number) => {
    // Skip if already has data or currently analyzing
    const q = quotes?.find((q) => q.id === quoteId);
    if (!q || q.ai_summary || analyzingIds.has(quoteId) || analysisResults[quoteId]) return;

    setAnalyzingIds((prev) => new Set(prev).add(quoteId));
    try {
      const result = await api.post<{ ai_summary: string; ai_analysis: string }>(`/muse/quotes/${quoteId}/analyze`);
      setAnalysisResults((prev) => ({ ...prev, [quoteId]: result }));
    } catch {
      showError("AI 解读失败，点击可重试");
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(quoteId);
        return next;
      });
    }
  };

  const handleAddTodo = async (content: string) => {
    try {
      const result = await api.post<{ id: number; parsed_title: string; parsed_deadline: string }>("/productivity/todos", { content });
      showSuccess("待办已添加");
      if (result.parsed_deadline) {
        scheduleTodoReminder(result.parsed_title || content, result.parsed_deadline);
      }
      refetchTodos();
    } catch (e) {
      showError(e instanceof Error ? e.message : "添加失败");
    }
  };

  const handleToggleTodo = async (id: number, isDone: boolean) => {
    try {
      await api.patch(`/productivity/todos/${id}`, { is_done: isDone });
      refetchTodos();
    } catch (e) {
      showError(e instanceof Error ? e.message : "更新失败");
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await api.del(`/productivity/todos/${id}`);
      showSuccess("待办已删除");
      refetchTodos();
    } catch (e) {
      showError(e instanceof Error ? e.message : "删除失败");
    }
  };

  const handleGenerateQuotes = async () => {
    setGenerating(true);
    try {
      const result = await api.post<{ generated: number }>("/muse/quotes/generate?count=3");
      refetchQuotes();
      if (result.generated > 0) {
        showSuccess(`生成了 ${result.generated} 条新书摘`);
      } else {
        showInfo("暂时没有新书摘，稍后再试");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="灵感角落"
        subtitle="书摘 · AI 解读 · 心情 · 塔罗"
        mascotMood="excited"
      />

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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRelatedQuoteId(q.id);
                            setShowNoteInput(true);
                          }}
                          className="btn-soft text-[10px] px-3 py-1.5 mt-2"
                        >
                          ✏️ 写感想
                        </button>
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

      {/* Note Input */}
      {showNoteInput && (
        <div className="cute-card p-4 space-y-3 fade-in-up">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--color-muted-foreground)]">
              <PenLine size={12} className="inline mr-1" /> 写下此刻
            </p>
            <button onClick={() => setShowNoteInput(false)} className="text-lg leading-none">&times;</button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {MOODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMood(m.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2 ${
                  selectedMood === m.key
                    ? "border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    : "border-transparent bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                }`}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
          {selectedMood !== "neutral" && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[var(--color-muted-foreground)]">强度</span>
              <input
                type="range"
                min={1}
                max={5}
                value={moodIntensity}
                onChange={(e) => setMoodIntensity(parseInt(e.target.value))}
                className="flex-1 accent-[var(--color-primary)]"
              />
              <span className="text-[10px] font-semibold text-[var(--color-accent-foreground)] w-4 text-center">{moodIntensity}</span>
            </div>
          )}
          <VoiceInput onResult={(text) => setNoteText((prev) => prev ? prev + " " + text : text)} placeholder="语音记录灵感..." />
          <textarea
            placeholder="灵感一闪，快记下来..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="cute-input resize-none"
          />
          <div className="flex items-center gap-2">
            <Tag size={12} className="text-[var(--color-muted-foreground)] shrink-0" />
            <input
              placeholder="标签（用逗号分隔，如：读书,灵感）"
              value={noteTags}
              onChange={(e) => setNoteTags(e.target.value)}
              className="cute-input text-xs flex-1"
            />
          </div>
          <button onClick={addNote} className="btn-primary w-full text-xs">🐾 记录此刻</button>
        </div>
      )}

      {!showNoteInput && (
        <button
          onClick={() => setShowNoteInput(true)}
          className="w-full cute-card p-3 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <PenLine size={14} /> 写一条闪念
        </button>
      )}

      {/* Mood Rainbow */}
      <MoodRainbow moodData={moodData ?? []} />

      {/* Mood Trend */}
      <MoodTrend moodData={moodData ?? []} />

      {/* AI Mood Care */}
      {moodAdvice && (
        <div className="cute-card p-4 space-y-2 fade-in-up">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--color-muted-foreground)]">
              <Sparkles size={12} className="inline mr-1" /> 小狗的暖心话
            </p>
            <button
              onClick={refetchAdvice}
              className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
              title="刷新"
            >
              <Shuffle size={12} className="text-[var(--color-muted-foreground)]" />
            </button>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#FFF8E1] to-[#FFE4B5]">
            <p className="text-xs leading-relaxed">{moodAdvice.advice}</p>
          </div>
        </div>
      )}

      {/* Tarot */}
      <TarotSection onError={showError} />

      {/* Recent Notes */}
      <div className="cute-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">🐾 最近的闪念</p>
        </div>

        {/* Search and filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <input
              placeholder="搜索闪念..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="cute-input text-xs pl-7 w-full"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterTag("")}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border ${
                  !filterTag
                    ? "border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    : "border-transparent bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                }`}
              >
                全部
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border ${
                    filterTag === tag
                      ? "border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                      : "border-transparent bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
        {notesLoading ? (
          <ListSkeleton count={3} />
        ) : (notes).length === 0 ? (
          <div className="text-center py-6">
            <PuppyMascot size={40} mood="sleeping" className="mx-auto" />
            <p className="text-xs text-[var(--color-muted-foreground)] mt-2">还没有记录，写下第一条闪念吧</p>
          </div>
        ) : (
          (notes).slice(0, 10).map((n, i) => (
            <div
              key={n.id}
              className="p-3 rounded-xl bg-[var(--color-muted)] fade-in-up group relative"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {editingNoteId === n.id ? (
                <div className="space-y-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {MOODS.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setEditMood(m.key)}
                        className={`px-2 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                          editMood === m.key
                            ? "border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                            : "border-transparent bg-[var(--color-background)] text-[var(--color-muted-foreground)]"
                        }`}
                      >
                        {m.emoji}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                    className="cute-input resize-none text-xs w-full"
                  />
                  <div className="flex items-center gap-2">
                    <Tag size={11} className="text-[var(--color-muted-foreground)] shrink-0" />
                    <input
                      placeholder="标签（逗号分隔）"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="cute-input text-[10px] flex-1"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingNoteId(null)} className="p-1.5 rounded-lg hover:bg-[var(--color-background)] transition-colors">
                      <X size={14} className="text-[var(--color-muted-foreground)]" />
                    </button>
                    <button onClick={saveEditNote} className="p-1.5 rounded-lg hover:bg-[var(--color-background)] transition-colors">
                      <Check size={14} className="text-green-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{MOODS.find((m) => m.key === n.mood)?.emoji ?? "😶"}</span>
                    <span className="text-[10px] text-[var(--color-muted-foreground)] font-medium">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                    <button
                      onClick={() => startEditNote(n)}
                      className="ml-auto p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-background)] transition-all"
                    >
                      <PenLine size={12} className="text-[var(--color-muted-foreground)]" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteNote(n.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-background)] transition-all"
                    >
                      <Trash2 size={12} className="text-[var(--color-destructive)]" />
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed">{n.content}</p>
                  {n.tags && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {n.tags.split(",").map((tag, ti) => {
                        const t = tag.trim();
                        if (!t) return null;
                        return (
                          <span key={ti} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
                            {t}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      <ToastContainer />

      {confirmDeleteNote !== null && (
        <ConfirmDialog
          title="删除闪念"
          message="确定要删除这条闪念吗？"
          confirmLabel="删除"
          destructive
          onConfirm={() => { deleteNote(confirmDeleteNote); setConfirmDeleteNote(null); }}
          onCancel={() => setConfirmDeleteNote(null)}
        />
      )}
    </div>
  );
}
