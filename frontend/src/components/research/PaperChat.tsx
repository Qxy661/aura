import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PaperChatProps {
  articleId: number;
  articleTitle: string;
  onClose: () => void;
}

export function PaperChat({ articleId, articleTitle, onClose }: PaperChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await api.post<{ reply: string }>(`/research/articles/${articleId}/chat`, {
        message: text,
        history: messages,
      });
      setMessages([...newMessages, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "抱歉，发生了错误，请重试。" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end md:items-center md:justify-center">
      <div className="bg-[var(--color-background)] w-full md:w-[420px] md:rounded-2xl rounded-t-2xl h-[80vh] md:h-[600px] flex flex-col border-2 border-[var(--color-border)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[var(--color-foreground)] truncate">
              💬 论文对话
            </p>
            <p className="text-[10px] text-[var(--color-muted-foreground)] truncate mt-0.5">
              {articleTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                向 AI 提问关于这篇论文的任何问题
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[var(--color-primary)] text-white rounded-br-sm"
                    : "bg-[var(--color-muted)] text-[var(--color-foreground)] rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[var(--color-muted)] px-3 py-2 rounded-xl rounded-bl-sm">
                <Loader2 size={14} className="animate-spin text-[var(--color-muted-foreground)]" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[var(--color-border)]">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="问点什么..."
              className="cute-input text-xs flex-1"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="btn-primary px-3 py-2 flex items-center justify-center"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
