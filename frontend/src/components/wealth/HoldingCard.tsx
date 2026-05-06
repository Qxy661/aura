import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { TrendLine } from "@/components/charts/TrendLine";

interface Holding {
  id: number;
  name: string;
  code: string;
  asset_type: string;
  cost_price: number;
  shares: number;
  created_at: string;
}

interface MarketData {
  current_price: number;
  market_value: number;
  profit: number;
  profit_pct: number;
  change_pct: number;
  daily_pnl?: number;
}

interface HoldingCardProps {
  holding: Holding;
  index: number;
  onDelete: (id: number) => void;
  onUpdated: () => void;
  onError: (msg: string) => void;
  marketData?: MarketData;
}

interface PriceHistoryData {
  cost_price: number;
  history: { price: number; recorded_at: string }[];
}

export function HoldingCard({ holding, index, onDelete, onUpdated, onError, marketData }: HoldingCardProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData | null>(null);
  const [form, setForm] = useState({
    name: holding.name,
    code: holding.code,
    cost_price: String(holding.cost_price),
    shares: String(holding.shares),
  });

  useEffect(() => {
    if (showTrend && !priceHistory) {
      api.get<PriceHistoryData>(`/wealth/holdings/${holding.id}/history?days=30`)
        .then(setPriceHistory)
        .catch(() => {});
    }
  }, [showTrend, holding.id, priceHistory]);

  const save = async () => {
    try {
      await api.patch(`/wealth/holdings/${holding.id}`, {
        name: form.name,
        code: form.code,
        cost_price: parseFloat(form.cost_price) || 0,
        shares: parseFloat(form.shares) || 0,
      });
      setEditing(false);
      onUpdated();
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存失败");
    }
  };

  if (editing) {
    return (
      <div className="cute-card p-4 space-y-2 fade-in-up">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="cute-input text-xs"
          placeholder="名称"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="cute-input text-xs"
            placeholder="代码"
          />
          <input
            type="number"
            value={form.cost_price}
            onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
            className="cute-input text-xs"
            placeholder="成本价"
          />
          <input
            type="number"
            value={form.shares}
            onChange={(e) => setForm({ ...form, shares: e.target.value })}
            className="cute-input text-xs"
            placeholder="份额"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="flex-1 btn-soft text-xs py-2">取消</button>
          <button onClick={save} className="flex-1 btn-primary text-xs py-2">保存</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="cute-card p-4 fade-in-up cursor-pointer hover:shadow-md transition-shadow"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => !editing && navigate(`/wealth/holding/${holding.id}`)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center text-lg">
            {holding.asset_type === "stock" || holding.asset_type === "a_share" ? "📈" : holding.asset_type === "us_stock" ? "🇺🇸" : holding.asset_type === "crypto" ? "₿" : "📦"}
          </div>
          <div>
            <p className="text-sm font-bold">{holding.name}</p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              {holding.code} · 成本 ¥{holding.cost_price} · {holding.shares} 份
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(true)}
            className="p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
          >
            <Pencil size={14} className="text-[var(--color-muted-foreground)]" />
          </button>
          <button
            onClick={() => onDelete(holding.id)}
            className="p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
          >
            <Trash2 size={14} className="text-[var(--color-destructive)]" />
          </button>
        </div>
      </div>

      {/* Market Data */}
      {marketData && marketData.current_price > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--color-muted)] flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[var(--color-muted-foreground)]">现价</p>
            <p className="text-sm font-bold">¥{marketData.current_price}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-muted-foreground)]">市值</p>
            <p className="text-sm font-bold">¥{marketData.market_value.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--color-muted-foreground)]">盈亏</p>
            <p className={`text-sm font-bold ${marketData.profit >= 0 ? "text-red-500" : "text-green-500"}`}>
              {marketData.profit >= 0 ? "+" : ""}¥{marketData.profit.toLocaleString()}
            </p>
            <p className={`text-[10px] ${marketData.profit >= 0 ? "text-red-400" : "text-green-400"}`}>
              {marketData.profit_pct >= 0 ? "+" : ""}{marketData.profit_pct}%
            </p>
            {marketData.change_pct !== 0 && (
              <p className={`text-[10px] mt-0.5 ${marketData.change_pct >= 0 ? "text-red-400" : "text-green-400"}`}>
                今日 {marketData.change_pct >= 0 ? "+" : ""}{marketData.change_pct}%
              </p>
            )}
          </div>
        </div>
      )}

      {/* Trend toggle */}
      <button
        onClick={() => setShowTrend(!showTrend)}
        className="flex items-center gap-1 text-[10px] text-[var(--color-accent-foreground)] mt-2 font-semibold"
      >
        📈 走势 {showTrend ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {showTrend && priceHistory && priceHistory.history.length > 1 && (
        <div className="mt-1">
          <TrendLine
            data={priceHistory.history.map((h) => ({
              price: h.price,
              date: h.recorded_at,
            }))}
            costPrice={priceHistory.cost_price}
            width={280}
            height={60}
          />
        </div>
      )}
      {showTrend && priceHistory && priceHistory.history.length <= 1 && (
        <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1">
          数据不足，需要更多天数的记录
        </p>
      )}
    </div>
  );
}
