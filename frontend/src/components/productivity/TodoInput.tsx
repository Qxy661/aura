import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { VoiceInput } from "@/components/ui/VoiceInput";

interface TodoInputProps {
  onAdd: (content: string) => Promise<void>;
}

export function TodoInput({ onAdd }: TodoInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      await onAdd(text.trim());
      setText("");
    } finally {
      setLoading(false);
    }
  };

  if (voiceMode) {
    return (
      <div className="space-y-2">
        <VoiceInput
          onResult={(spoken) => {
            setText(spoken);
            setVoiceMode(false);
          }}
          placeholder="说出你要做的事..."
        />
        <div className="flex gap-2">
          <button onClick={() => setVoiceMode(false)} className="btn-soft text-[10px] px-2 py-1.5 flex-1">
            切换键盘
          </button>
          {text && (
            <button onClick={handleSubmit} className="btn-primary text-[10px] px-2 py-1.5 flex-1">
              添加: {text.slice(0, 15)}...
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="例：周五前看完CVPR论文"
        className="cute-input flex-1 text-xs"
        disabled={loading}
      />
      <button
        onClick={() => setVoiceMode(true)}
        className="p-2 rounded-xl bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors shrink-0"
        title="语音输入"
      >
        🎤
      </button>
      <button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className="btn-primary px-3 py-2 flex items-center gap-1 text-xs shrink-0"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
        添加
      </button>
    </div>
  );
}
