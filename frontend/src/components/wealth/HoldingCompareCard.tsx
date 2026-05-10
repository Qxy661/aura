import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, GitCompareArrows } from "lucide-react";

interface PortfolioHolding {
  id: number;
  name: string;
  code: string;
  asset_type: string;
  cost_price: number;
  current_price: number;
  market_value: number;
  profit: number;
  profit_pct: number;
  change_pct: number;
}

interface Portfolio {
  holdings: PortfolioHolding[];
}

export function HoldingCompareCard() {
  const { data: portfolio } = useApi<Portfolio>(
    () => api.get("/wealth/portfolio")
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());

  if (!portfolio || portfolio.holdings.length < 2) return null;

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  };

  const selectedHoldings = portfolio.holdings.filter((h) => selected.has(h.id));

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <GitCompareArrows size={12} className="text-[var(--color-primary)]" />
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">持仓对比</p>
        <span className="text-[9px] text-[var(--color-muted-foreground)] ml-auto">
          选择2-4个持仓
        </span>
      </div>

      {/* Selector pills */}
      <div className="flex gap-1.5 flex-wrap">
        {portfolio.holdings.map((h) => (
          <button
            key={h.id}
            onClick={() => toggle(h.id)}
            className={`px-2 py-1 rounded-full text-[10px] font-semibold transition-all border ${
              selected.has(h.id)
                ? "border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                : "border-transparent bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
            }`}
          >
            {h.name.slice(0, 4)}
          </button>
        ))}
      </div>

      {/* Comparison table */}
      {selectedHoldings.length >= 2 && (
        <div className="fade-in-up overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-[var(--color-muted-foreground)]">
                <th className="text-left py-1 font-medium">指标</th>
                {selectedHoldings.map((h) => (
                  <th key={h.id} className="text-right py-1 font-medium">{h.name.slice(0, 4)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-medium">
              <tr className="border-t border-[var(--color-border)]">
                <td className="py-1.5 text-[var(--color-muted-foreground)]">现价</td>
                {selectedHoldings.map((h) => (
                  <td key={h.id} className="text-right py-1.5">¥{h.current_price.toFixed(2)}</td>
                ))}
              </tr>
              <tr className="border-t border-[var(--color-border)]">
                <td className="py-1.5 text-[var(--color-muted-foreground)]">今日涨跌</td>
                {selectedHoldings.map((h) => (
                  <td key={h.id} className={`text-right py-1.5 ${h.change_pct >= 0 ? "text-red-500" : "text-green-500"}`}>
                    {h.change_pct >= 0 ? "+" : ""}{h.change_pct.toFixed(2)}%
                  </td>
                ))}
              </tr>
              <tr className="border-t border-[var(--color-border)]">
                <td className="py-1.5 text-[var(--color-muted-foreground)]">累计收益</td>
                {selectedHoldings.map((h) => (
                  <td key={h.id} className={`text-right py-1.5 ${h.profit >= 0 ? "text-red-500" : "text-green-500"}`}>
                    {h.profit >= 0 ? "+" : ""}{h.profit_pct.toFixed(2)}%
                  </td>
                ))}
              </tr>
              <tr className="border-t border-[var(--color-border)]">
                <td className="py-1.5 text-[var(--color-muted-foreground)]">市值</td>
                {selectedHoldings.map((h) => (
                  <td key={h.id} className="text-right py-1.5">¥{h.market_value.toLocaleString()}</td>
                ))}
              </tr>
              <tr className="border-t border-[var(--color-border)]">
                <td className="py-1.5 text-[var(--color-muted-foreground)]">盈亏额</td>
                {selectedHoldings.map((h) => (
                  <td key={h.id} className={`text-right py-1.5 ${h.profit >= 0 ? "text-red-500" : "text-green-500"}`}>
                    {h.profit >= 0 ? "+" : ""}¥{h.profit.toFixed(0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* Visual bar comparison */}
          <div className="mt-3 space-y-1.5">
            <p className="text-[9px] text-[var(--color-muted-foreground)]">收益率对比</p>
            {selectedHoldings.map((h) => {
              const maxPct = Math.max(...selectedHoldings.map((s) => Math.abs(s.profit_pct)), 1);
              const barWidth = Math.min(Math.abs(h.profit_pct) / maxPct * 100, 100);
              return (
                <div key={h.id} className="flex items-center gap-2">
                  <span className="text-[9px] w-10 truncate">{h.name.slice(0, 4)}</span>
                  <div className="flex-1 h-3 bg-[var(--color-muted)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${h.profit >= 0 ? "bg-red-400" : "bg-green-400"}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-bold w-14 text-right ${h.profit >= 0 ? "text-red-500" : "text-green-500"}`}>
                    {h.profit >= 0 ? "+" : ""}{h.profit_pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
