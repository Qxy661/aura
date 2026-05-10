import { useState, useEffect, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { Eye, Plus, Trash2, ArrowRight, Search, X } from "lucide-react";

interface WatchlistItem {
  id: number;
  name: string;
  code: string;
  asset_type: string;
  target_price: number | null;
  note: string;
  created_at: string;
  current_price?: number;
  change_pct?: number;
}

interface SearchResult {
  name: string;
  code: string;
  type: string;
}

interface Props {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onConvert?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  fund: "基金",
  stock: "A股",
  a_share: "A股",
  us_stock: "美股",
  crypto: "加密",
  hk_stock: "港股",
};

export function WatchlistCard({ onSuccess, onError, onConvert }: Props) {
  const { data: items, refetch, loading } = useApi<WatchlistItem[]>(
    () => api.get("/wealth/watchlist")
  );

  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [editTarget, setEditTarget] = useState<number | null>(null);
  const [targetValue, setTargetValue] = useState("");
  const [convertId, setConvertId] = useState<number | null>(null);
  const [convertPrice, setConvertPrice] = useState("");
  const [convertShares, setConvertShares] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/wealth/search?q=${encodeURIComponent(searchQuery.trim())}&limit=6`) as SearchResult[];
        setSearchResults(res);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchQuery]);

  const addItem = async (item: SearchResult) => {
    try {
      await api.post("/wealth/watchlist", {
        name: item.name,
        code: item.code,
        asset_type: item.type,
      });
      onSuccess?.(`已关注 ${item.name}`);
      setSearchQuery("");
      setSearchResults([]);
      setShowAdd(false);
      refetch();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "添加失败");
    }
  };

  const removeItem = async (id: number) => {
    try {
      await api.del(`/wealth/watchlist/${id}`);
      onSuccess?.("已取消关注");
      refetch();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "删除失败");
    }
  };

  const saveTarget = async (id: number) => {
    const price = parseFloat(targetValue);
    try {
      await api.patch(`/wealth/watchlist/${id}`, {
        target_price: isNaN(price) ? null : price,
      });
      setEditTarget(null);
      refetch();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "保存失败");
    }
  };

  const doConvert = async () => {
    if (!convertId || !convertPrice || !convertShares) return;
    try {
      await api.post(`/wealth/watchlist/${convertId}/convert`, {
        cost_price: parseFloat(convertPrice),
        shares: parseFloat(convertShares),
      });
      onSuccess?.("已转入持仓");
      setConvertId(null);
      setConvertPrice("");
      setConvertShares("");
      refetch();
      onConvert?.();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "转入失败");
    }
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Eye size={12} className="text-[var(--color-primary)]" />
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">关注列表</p>
          {items && items.length > 0 && (
            <span className="text-[9px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] px-1.5 py-0.5 rounded-full font-semibold">
              {items.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-[10px] font-semibold text-[var(--color-primary)] flex items-center gap-0.5"
        >
          {showAdd ? <X size={10} /> : <Plus size={10} />}
          {showAdd ? "取消" : "关注"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="space-y-2 fade-in-up">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索基金/股票名称或代码..."
              className="cute-input text-[11px] pl-7 w-full"
              autoFocus
            />
          </div>
          {searching && <p className="text-[10px] text-[var(--color-muted-foreground)] text-center">搜索中...</p>}
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.code}
                  onClick={() => addItem(r)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors text-left"
                >
                  <div>
                    <p className="text-[11px] font-semibold">{r.name}</p>
                    <p className="text-[9px] text-[var(--color-muted-foreground)]">{r.code} · {TYPE_LABELS[r.type] || r.type}</p>
                  </div>
                  <Plus size={12} className="text-[var(--color-primary)]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-[var(--color-muted)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">还没有关注的标的</p>
          <p className="text-[9px] text-[var(--color-muted-foreground)] mt-1">点击上方"关注"添加想跟踪的基金或股票</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-muted)]/50 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-semibold truncate">{item.name}</p>
                  <span className="text-[8px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] px-1 py-0.5 rounded font-medium shrink-0">
                    {TYPE_LABELS[item.asset_type] || item.asset_type}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-[var(--color-muted-foreground)]">{item.code}</span>
                  {item.current_price != null && (
                    <span className="text-[9px] font-medium">
                      ¥{item.current_price.toFixed(item.current_price < 1 ? 4 : 2)}
                    </span>
                  )}
                  {item.change_pct != null && item.change_pct !== 0 && (
                    <span className={`text-[9px] font-bold ${item.change_pct >= 0 ? "text-red-500" : "text-green-500"}`}>
                      {item.change_pct >= 0 ? "+" : ""}{item.change_pct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Target price */}
              {editTarget === item.id ? (
                <div className="flex items-center gap-1">
                  <input
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="目标价"
                    className="cute-input text-[9px] w-16 py-0.5"
                    autoFocus
                  />
                  <button onClick={() => saveTarget(item.id)} className="text-[9px] text-[var(--color-primary)] font-semibold">OK</button>
                  <button onClick={() => setEditTarget(null)} className="text-[9px] text-[var(--color-muted-foreground)]">X</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditTarget(item.id); setTargetValue(item.target_price?.toString() || ""); }}
                  className="text-[9px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] shrink-0"
                >
                  {item.target_price ? `目标 ¥${item.target_price}` : "设目标"}
                </button>
              )}

              {/* Convert & Delete */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setConvertId(item.id)}
                  className="p-1 rounded hover:bg-[var(--color-accent)]"
                  title="转入持仓"
                >
                  <ArrowRight size={10} className="text-[var(--color-primary)]" />
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 rounded hover:bg-red-50"
                  title="取消关注"
                >
                  <Trash2 size={10} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Convert overlay */}
      {convertId !== null && (
        <div className="p-3 rounded-lg bg-[var(--color-accent)] space-y-2 fade-in-up">
          <p className="text-[11px] font-semibold">转入持仓</p>
          <div className="flex gap-2">
            <input
              value={convertPrice}
              onChange={(e) => setConvertPrice(e.target.value)}
              placeholder="买入价"
              type="number"
              step="any"
              className="cute-input text-[10px] flex-1 py-1"
            />
            <input
              value={convertShares}
              onChange={(e) => setConvertShares(e.target.value)}
              placeholder="份额"
              type="number"
              step="any"
              className="cute-input text-[10px] flex-1 py-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setConvertId(null)} className="btn-soft text-[10px] px-3 py-1">取消</button>
            <button
              onClick={doConvert}
              disabled={!convertPrice || !convertShares}
              className="btn-primary text-[10px] px-3 py-1 disabled:opacity-40"
            >
              确认买入
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
