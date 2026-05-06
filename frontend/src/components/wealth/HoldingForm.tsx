import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

const ASSET_TYPES = [
  { value: "fund", label: "基金", icon: "📦" },
  { value: "a_share", label: "A股", icon: "📈" },
  { value: "us_stock", label: "美股", icon: "🇺🇸" },
  { value: "hk_stock", label: "港股", icon: "🇭🇰" },
  { value: "crypto", label: "加密", icon: "₿" },
];

interface FundSuggestion {
  code: string;
  name: string;
  type: string;
}

interface HoldingFormProps {
  onSaved: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}

export function HoldingForm({ onSaved, onCancel, onError }: HoldingFormProps) {
  const [form, setForm] = useState({ name: "", code: "", asset_type: "fund", cost_price: "", shares: "" });
  const [searchResults, setSearchResults] = useState<FundSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const resp = await api.get<{ results: FundSuggestion[] }>(`/wealth/search?q=${encodeURIComponent(query)}&limit=8`);
      setSearchResults(resp.results);
      setShowDropdown(resp.results.length > 0);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleNameChange = (value: string) => {
    setForm({ ...form, name: value });
    if (form.asset_type === "fund") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    }
  };

  const selectFund = (fund: FundSuggestion) => {
    setForm({ ...form, name: fund.name, code: fund.code });
    setShowDropdown(false);
    setSearchResults([]);
  };

  const submit = async () => {
    if (!form.name || !form.code) return;
    try {
      await api.post("/wealth/holdings", {
        name: form.name,
        code: form.code,
        asset_type: form.asset_type,
        cost_price: parseFloat(form.cost_price) || 0,
        shares: parseFloat(form.shares) || 0,
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "添加失败");
    }
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">添加持仓</p>
        <button onClick={onCancel} className="text-lg leading-none">&times;</button>
      </div>

      {/* Asset type selector */}
      <div className="flex gap-1.5 flex-wrap">
        {ASSET_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setForm({ ...form, asset_type: t.value })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
              form.asset_type === t.value
                ? "border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                : "border-transparent bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Name input with autocomplete for funds */}
      <div ref={searchRef} className="relative">
        <input
          placeholder="名称 (如: 沪深300ETF)"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => {
            if (searchResults.length > 0) setShowDropdown(true);
          }}
          className="cute-input w-full"
        />
        {showDropdown && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searching && (
              <div className="px-3 py-2 text-[11px] text-[var(--color-muted-foreground)]">搜索中...</div>
            )}
            {searchResults.map((fund) => (
              <button
                key={fund.code}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectFund(fund);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--color-muted)] transition-colors flex items-center justify-between border-b border-[var(--color-border)] last:border-0"
              >
                <span className="text-xs font-medium truncate">{fund.name}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)] ml-2 shrink-0">{fund.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        placeholder={form.asset_type === "fund" ? "基金代码 (如: 510300)" : form.asset_type === "us_stock" ? "美股代码 (如: AAPL)" : "股票代码 (如: 600519)"}
        value={form.code}
        onChange={(e) => setForm({ ...form, code: e.target.value })}
        className="cute-input"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="成本价"
          type="number"
          value={form.cost_price}
          onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
          className="cute-input"
        />
        <input
          placeholder="份额"
          type="number"
          value={form.shares}
          onChange={(e) => setForm({ ...form, shares: e.target.value })}
          className="cute-input"
        />
      </div>
      <button onClick={submit} className="btn-primary w-full text-xs">确认添加</button>
    </div>
  );
}
