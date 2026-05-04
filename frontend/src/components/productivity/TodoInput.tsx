import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

interface TodoInputProps {
  onAdd: (content: string) => Promise<void>;
}

export function TodoInput({ onAdd }: TodoInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

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
