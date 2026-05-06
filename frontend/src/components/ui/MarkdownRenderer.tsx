import ReactMarkdown from "react-markdown";

interface Props {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: Props) {
  return (
    <div className={`prose prose-sm max-w-none text-xs leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold mt-4 mb-2 text-[var(--color-foreground)]">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold mt-3 mb-1.5 text-[var(--color-foreground)]">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold mt-2 mb-1 text-[var(--color-foreground)]">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-[var(--color-foreground)]">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-2 space-y-0.5 text-[var(--color-foreground)]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-2 space-y-0.5 text-[var(--color-foreground)]">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[var(--color-foreground)]">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--color-foreground)]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[var(--color-muted-foreground)]">{children}</em>
          ),
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-[var(--color-muted)] text-[10px] font-mono">{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="pl-3 border-l-2 border-[var(--color-primary)] italic text-[var(--color-muted-foreground)] my-2">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
