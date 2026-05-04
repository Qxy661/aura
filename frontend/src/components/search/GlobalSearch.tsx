import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Search, FileText, TrendingUp, BookOpen, Quote, X } from "lucide-react";

interface SearchResult {
  type: "article" | "holding" | "note" | "quote";
  module: "research" | "wealth" | "muse";
  id: number;
  title: string;
  subtitle: string;
  created_at: string;
}

const TYPE_CONFIG = {
  article: { icon: FileText, label: "论文", color: "text-blue-500" },
  holding: { icon: TrendingUp, label: "持仓", color: "text-red-500" },
  note: { icon: BookOpen, label: "闪念", color: "text-amber-500" },
  quote: { icon: Quote, label: "书摘", color: "text-purple-500" },
};

const MODULE_ROUTES: Record<string, string> = {
  research: "/",
  wealth: "/wealth",
  muse: "/muse",
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<{ results: SearchResult[]; total: number }>(
          `/search?q=${encodeURIComponent(query.trim())}`
        );
        setResults(res.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    navigate(MODULE_ROUTES[r.module] || "/");
  };

  return (
    <div ref={containerRef} className="relative mb-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="搜索全部内容..."
          className="cute-input pl-9 pr-8 text-xs"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 cute-card p-3 max-h-80 overflow-y-auto z-50 shadow-lg">
          {loading ? (
            <p className="text-xs text-[var(--color-muted-foreground)] text-center py-4">搜索中...</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-[var(--color-muted-foreground)] text-center py-4">没有找到匹配内容</p>
          ) : (
            <div className="space-y-1">
              {results.map((r, i) => {
                const config = TYPE_CONFIG[r.type];
                const Icon = config.icon;
                return (
                  <button
                    key={`${r.type}-${r.id}-${i}`}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[var(--color-muted)] transition-colors text-left"
                  >
                    <Icon size={14} className={`mt-0.5 shrink-0 ${config.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{r.title}</p>
                      {r.subtitle && (
                        <p className="text-[10px] text-[var(--color-muted-foreground)] truncate mt-0.5">{r.subtitle}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-[var(--color-muted-foreground)] shrink-0 mt-0.5">{config.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
