import { useState } from "react";

interface Quote {
  id: number;
  content: string;
  author: string;
  book_title: string;
  ai_summary: string;
  ai_analysis: string;
}

interface QuoteCardProps {
  quote: Quote;
  index: number;
  onWriteReflection: (quoteId: number) => void;
}

export function QuoteCard({ quote, index, onWriteReflection }: QuoteCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (section: string) => {
    const key = `${quote.id}-${section}`;
    setExpandedId(expandedId === key ? null : key);
  };

  return (
    <div
      className="relative p-4 rounded-2xl bg-gradient-to-br from-[var(--color-muted)] to-[var(--color-cream)] border border-[var(--color-border)] fade-in-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {quote.book_title && (
        <span className="tag text-[10px] mb-2 inline-flex">📖 {quote.book_title}</span>
      )}

      <div className="absolute top-2 left-3 text-3xl opacity-10 select-none">"</div>
      <p className="text-sm leading-relaxed pl-4 italic text-[var(--color-foreground)]">
        {quote.content}
      </p>

      <p className="text-[11px] text-[var(--color-muted-foreground)] font-semibold mt-2 pl-4">
        — {quote.author || "佚名"}
      </p>

      {quote.ai_summary && (
        <div className="mt-3 pl-4 border-l-2 border-[var(--color-primary)]">
          <button
            onClick={() => toggle("summary")}
            className="text-[11px] font-bold text-[var(--color-accent-foreground)] flex items-center gap-1"
          >
            💡 AI 解读
            <span className="text-[9px]">{expandedId === `${quote.id}-summary` ? "▲" : "▼"}</span>
          </button>
          {expandedId === `${quote.id}-summary` && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1.5 leading-relaxed">
              {quote.ai_summary}
            </p>
          )}
        </div>
      )}

      {quote.ai_analysis && (
        <div className="mt-2 pl-4 border-l-2 border-[var(--color-accent-foreground)]">
          <button
            onClick={() => toggle("analysis")}
            className="text-[11px] font-bold text-[var(--color-accent-foreground)] flex items-center gap-1"
          >
            🔍 深度分析
            <span className="text-[9px]">{expandedId === `${quote.id}-analysis` ? "▲" : "▼"}</span>
          </button>
          {expandedId === `${quote.id}-analysis` && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1.5 leading-relaxed whitespace-pre-wrap">
              {quote.ai_analysis}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mt-3 pl-4">
        <button
          onClick={() => onWriteReflection(quote.id)}
          className="text-[11px] text-[var(--color-accent-foreground)] font-bold hover:underline"
        >
          ✏️ 写感想
        </button>
      </div>
    </div>
  );
}
