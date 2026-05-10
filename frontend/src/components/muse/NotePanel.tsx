import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { PuppyMascot } from "@/components/ui/PuppyMascot";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { VoiceInput } from "@/components/ui/VoiceInput";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PenLine, Trash2, Search, Tag, Check, X } from "lucide-react";

interface NotePanelProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

interface Note {
  id: number;
  content: string;
  quote_id: number | null;
  mood: string;
  tags: string;
  created_at: string;
}

const MOODS = [
  { key: "happy", label: "开心", emoji: "😊", color: "#F5C842" },
  { key: "calm", label: "平静", emoji: "😌", color: "#6BBF59" },
  { key: "inspired", label: "灵感", emoji: "✨", color: "#F5A623" },
  { key: "sad", label: "emo", emoji: "😢", color: "#7BAFD4" },
  { key: "anxious", label: "焦虑", emoji: "😰", color: "#E85D4A" },
];

export function NotePanel({ onSuccess, onError }: NotePanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);

  const [noteText, setNoteText] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [selectedMood, setSelectedMood] = useState("neutral");
  const [moodIntensity, setMoodIntensity] = useState(3);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState("neutral");
  const [editTags, setEditTags] = useState("");

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

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  useEffect(() => {
    api.get<{ tags: string[] }>("/muse/notes/tags").then((res) => setAllTags(res.tags)).catch(() => {});
  }, []);

  const deleteNote = async (id: number) => {
    try {
      await api.del(`/muse/notes/${id}`);
      onSuccess("已删除");
      fetchNotes();
    } catch (e) {
      onError(e instanceof Error ? e.message : "删除失败");
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
      onSuccess("已更新");
      fetchNotes();
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新失败");
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      await api.post("/muse/notes", {
        content: noteText,
        mood: selectedMood,
        intensity: moodIntensity,
        tags: noteTags,
      });
      setNoteText("");
      setNoteTags("");
      setSelectedMood("neutral");
      setMoodIntensity(3);
      setShowNoteInput(false);
      onSuccess("灵感已记录");
      fetchNotes();
    } catch (e) {
      onError(e instanceof Error ? e.message : "记录失败");
    }
  };

  return (
    <div className="space-y-4">
      {/* Note Input */}
      {showNoteInput ? (
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
      ) : (
        <button
          onClick={() => setShowNoteInput(true)}
          className="w-full cute-card p-3 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <PenLine size={14} /> 写一条闪念
        </button>
      )}

      {/* Recent Notes */}
      <div className="cute-card p-4 space-y-3">
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">🐾 最近的闪念</p>

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
        ) : notes.length === 0 ? (
          <div className="text-center py-6">
            <PuppyMascot size={40} mood="sleeping" className="mx-auto" />
            <p className="text-xs text-[var(--color-muted-foreground)] mt-2">还没有记录，写下第一条闪念吧</p>
          </div>
        ) : (
          notes.slice(0, 10).map((n, i) => (
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
