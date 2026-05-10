import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { SparkLine } from "@/components/charts/SparkLine";
import { Search, Star, ShoppingCart, TrendingUp, Activity, X } from "lucide-react";

interface SearchResult {
  name: string;
  code: string;
  type: string;
}

interface FundDetail {
  code: string;
  name: string;
  nav: number;
  return_7d: number;
  return_30d: number;
  return_90d: number;
  return_180d: number;
  return_365d: number;
  volatility: number;
  data_points: number;
  recent_nav: { date: number; nav: number }[];
}

interface Props {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onWatchlist?: () => void;
  onBuy?: () => void;
}

function ReturnBadge({ label, value }: { label: string; value: number }) {
  const isPositive = value >= 0;
  return (
    <div className="flex flex-col items-center p-1.5 rounded-lg bg-[var(--color-muted)]/50">
      <span className="text-[8px] text-[var(--color-muted-foreground)]">{label}</span>
      <span className={`text-[11px] font-bold ${isPositive ? "text-red-500" : "text-green-500"}`}>
        {isPositive ? "+" : ""}{value.toFixed(2)}%
      </span>
    </div>
  );
}

export function FundResearchCard({ onSuccess, onError, onWatchlist, onBuy }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FundDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [buyPrice, setBuyPrice] = useState("");
  const [buyShares, setBuyShares] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/wealth/search?q=${encodeURIComponent(query.trim())}&limit=8`) as SearchResult[];
        setResults(res.filter((r) => r.type === "基金" || r.type === "" || r.type.includes("混合") || r.type.includes("股票") || r.type.includes("债券") || r.type.includes("指数")));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);

  const selectFund = async (code: string) => {
    setLoadingDetail(true);
    setResults([]);
    setQuery("");
    try {
      const detail = await api.get(`/wealth/fund-research/${code}`) as FundDetail;
      setSelected(detail);
    } catch {
      onError?.("基金详情获取失败");
    } finally {
      setLoadingDetail(false);
    }
  };

  const addToWatchlist = async () => {
    if (!selected) return;
    try {
      await api.post("/wealth/watchlist", {
        name: selected.name,
        code: selected.code,
        asset_type: "fund",
      });
      onSuccess?.(`已关注 ${selected.name}`);
      onWatchlist?.();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "添加失败");
    }
  };

  const doBuy = async () => {
    if (!selected || !buyPrice || !buyShares) return;
    try {
      await api.post("/wealth/holdings", {
        name: selected.name,
        code: selected.code,
        asset_type: "fund",
        cost_price: parseFloat(buyPrice),
        shares: parseFloat(buyShares),
      });
      onSuccess?.(`已买入 ${selected.name}`);
      setShowBuyForm(false);
      setBuyPrice("");
      setBuyShares("");
      onBuy?.();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "买入失败");
    }
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <Search size={12} className="text-[var(--color-primary)]" />
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">基金研究</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索基金名称或代码..."
          className="cute-input text-[11px] pl-7 w-full"
        />
      </div>

      {/* Search results dropdown */}
      {searching && <p className="text-[10px] text-[var(--color-muted-foreground)] text-center">搜索中...</p>}
      {results.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto border border-[var(--color-border)] rounded-lg">
          {results.map((r) => (
            <button
              key={r.code}
              onClick={() => selectFund(r.code)}
              className="w-full flex items-center justify-between p-2 hover:bg-[var(--color-muted)] transition-colors text-left"
            >
              <div>
                <p className="text-[11px] font-semibold">{r.name}</p>
                <p className="text-[9px] text-[var(--color-muted-foreground)]">{r.code} · {r.type}</p>
              </div>
              <TrendingUp size={12} className="text-[var(--color-primary)]" />
            </button>
          ))}
        </div>
      )}

      {/* Loading detail */}
      {loadingDetail && (
        <div className="space-y-2">
          <div className="h-6 bg-[var(--color-muted)] rounded animate-pulse" />
          <div className="h-20 bg-[var(--color-muted)] rounded animate-pulse" />
        </div>
      )}

      {/* Fund detail */}
      {selected && !loadingDetail && (
        <div className="space-y-3 fade-in-up">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold">{selected.name}</p>
              <p className="text-[10px] text-[var(--color-muted-foreground)]">{selected.code}</p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1">
              <X size={12} className="text-[var(--color-muted-foreground)]" />
            </button>
          </div>

          {/* NAV + Sparkline */}
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[9px] text-[var(--color-muted-foreground)]">最新净值</p>
              <p className="text-xl font-extrabold">{selected.nav.toFixed(4)}</p>
            </div>
            <div className="flex-1 h-10">
              <SparkLine
                data={selected.recent_nav.map((n) => n.nav)}
                color={selected.return_30d >= 0 ? "#E85D4A" : "#38A169"}
                height={40}
              />
            </div>
          </div>

          {/* Return badges */}
          <div className="grid grid-cols-5 gap-1">
            <ReturnBadge label="7天" value={selected.return_7d} />
            <ReturnBadge label="30天" value={selected.return_30d} />
            <ReturnBadge label="90天" value={selected.return_90d} />
            <ReturnBadge label="180天" value={selected.return_180d} />
            <ReturnBadge label="1年" value={selected.return_365d} />
          </div>

          {/* Risk indicator */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-muted)]/50">
            <Activity size={12} className="text-[var(--color-primary)]" />
            <div className="flex-1">
              <p className="text-[9px] text-[var(--color-muted-foreground)]">年化波动率</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${selected.volatility < 15 ? "bg-green-400" : selected.volatility < 25 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(selected.volatility * 2, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold">{selected.volatility}%</span>
              </div>
            </div>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
              selected.volatility < 15 ? "bg-green-100 text-green-600" : selected.volatility < 25 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
            }`}>
              {selected.volatility < 15 ? "低风险" : selected.volatility < 25 ? "中风险" : "高风险"}
            </span>
          </div>

          {/* Action buttons */}
          {!showBuyForm ? (
            <div className="flex gap-2">
              <button onClick={addToWatchlist} className="btn-soft text-[10px] flex-1 py-2 flex items-center justify-center gap-1">
                <Star size={11} /> 加入关注
              </button>
              <button onClick={() => setShowBuyForm(true)} className="btn-primary text-[10px] flex-1 py-2 flex items-center justify-center gap-1">
                <ShoppingCart size={11} /> 买入
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[var(--color-accent)] space-y-2 fade-in-up">
              <p className="text-[10px] font-semibold">买入 {selected.name}</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="买入净值"
                  className="cute-input text-[10px] flex-1 py-1"
                />
                <input
                  type="number"
                  step="any"
                  value={buyShares}
                  onChange={(e) => setBuyShares(e.target.value)}
                  placeholder="份额"
                  className="cute-input text-[10px] flex-1 py-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowBuyForm(false)} className="btn-soft text-[10px] px-3 py-1">取消</button>
                <button onClick={doBuy} disabled={!buyPrice || !buyShares} className="btn-primary text-[10px] px-3 py-1 disabled:opacity-40">确认买入</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!selected && !loadingDetail && results.length === 0 && !searching && (
        <div className="text-center py-4">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">搜索基金，查看详细收益和风险数据</p>
          <p className="text-[9px] text-[var(--color-muted-foreground)] mt-1">支持名称或代码搜索</p>
        </div>
      )}
    </div>
  );
}
