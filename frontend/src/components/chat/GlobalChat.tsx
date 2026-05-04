import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { X, Send, Loader2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function GlobalChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await api.post<{ reply: string }>("/chat", { message: text });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "抱歉，暂时无法回答。请稍后重试。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "我的持仓表现怎么样？",
    "最近有什么值得关注的论文？",
    "我的待办完成情况如何？",
    "总结一下我最近的闪念",
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 p-3 rounded-full bg-[var(--color-primary)] text-white shadow-lg hover:scale-105 transition-transform"
        title="AI 助手"
      >
        <Sparkles size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 max-h-[70vh] flex flex-col cute-card shadow-xl fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--color-primary)]" />
          <p className="text-xs font-bold">Aura AI 助手</p>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-[var(--color-muted)]">
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--color-muted-foreground)] text-center py-4">
              你好！我是 Aura，你的个人 AI 助手。可以问我关于你的论文、持仓、闪念、待办的任何问题。
            </p>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  className="w-full text-left text-[10px] p-2 rounded-lg bg-[var(--color-muted)] hover:bg-[var(--color-accent)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-muted)]"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-muted)] p-2.5 rounded-xl flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />
              <span className="text-xs text-[var(--color-muted-foreground)]">思考中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--color-border)]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="问我任何问题..."
            className="cute-input flex-1 text-xs"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 rounded-xl bg-[var(--color-primary)] text-white disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
