import { useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { NumberRoller } from "@/components/wealth/NumberRoller";
import { PieChart } from "@/components/charts/PieChart";
import { HeatMap } from "@/components/charts/HeatMap";
import { MiniBarChart } from "@/components/charts/MiniBarChart";

interface PortfolioHolding {
  id: number;
  name: string;
  profit: number;
  profit_pct: number;
  market_value: number;
  change_pct: number;
}

interface Portfolio {
  holdings: PortfolioHolding[];
  total_cost: number;
  total_market: number;
  total_profit: number;
  total_profit_pct: number;
}

interface AllocationItem {
  name: string;
  market_value: number;
}

interface Allocation {
  items: AllocationItem[];
  total: number;
}

interface PortfolioHeaderProps {
  portfolio: Portfolio;
  allocation: Allocation | null;
  loading: boolean;
  onRefresh: () => void;
}

export function PortfolioHeader({ portfolio, allocation, loading, onRefresh }: PortfolioHeaderProps) {
  const [showCharts, setShowCharts] = useState(false);

  // Calculate daily P&L
  const dailyPnl = portfolio.holdings.reduce((sum, h) => {
    if (h.market_value > 0 && h.change_pct !== 0) {
      return sum + (h.market_value * h.change_pct) / 100;
    }
    return sum;
  }, 0);

  return (
    <div className="gradient-card p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--color-accent-foreground)] opacity-80">
          组合总览
        </p>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg hover:bg-white/40 transition-colors"
          title="刷新行情"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Main numbers */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] text-[var(--color-muted-foreground)] mb-0.5">总资产</p>
          <NumberRoller
            value={portfolio.total_market}
            prefix="¥"
            decimals={0}
            className="text-2xl"
          />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            {portfolio.total_profit >= 0 ? (
              <TrendingUp size={14} className="text-red-500" />
            ) : (
              <TrendingDown size={14} className="text-green-500" />
            )}
            <NumberRoller
              value={portfolio.total_profit}
              prefix={portfolio.total_profit >= 0 ? "+¥" : "-¥"}
              decimals={0}
              className="text-base"
              colorize
            />
          </div>
          <NumberRoller
            value={portfolio.total_profit_pct}
            prefix={portfolio.total_profit_pct >= 0 ? "+" : ""}
            suffix="%"
            decimals={2}
            className="text-xs"
            colorize
          />
        </div>
      </div>

      {/* Daily P&L */}
      {dailyPnl !== 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/50">
          <span className="text-[10px] text-[var(--color-muted-foreground)]">今日盈亏</span>
          <span
            className={`text-xs font-bold tabular-nums ${
              dailyPnl >= 0 ? "text-red-500" : "text-green-500"
            }`}
          >
            {dailyPnl >= 0 ? "+" : ""}¥{dailyPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      )}

      {/* Cost / Market split */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl bg-white/60">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">总成本</p>
          <NumberRoller value={portfolio.total_cost} prefix="¥" decimals={0} className="text-sm" />
        </div>
        <div className="p-2.5 rounded-xl bg-white/60">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">总市值</p>
          <NumberRoller value={portfolio.total_market} prefix="¥" decimals={0} className="text-sm" />
        </div>
      </div>

      {/* Charts toggle */}
      <button
        onClick={() => setShowCharts(!showCharts)}
        className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent-foreground)] opacity-80"
      >
        📈 可视化图表 {showCharts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showCharts && (
        <div className="space-y-4 fade-in-up">
          {allocation && allocation.items.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--color-muted-foreground)] mb-2">持仓占比</p>
              <div className="flex justify-center">
                <PieChart
                  data={allocation.items.map((item) => ({
                    name: item.name.slice(0, 6),
                    value: item.market_value,
                  }))}
                  centerLabel={`¥${allocation.total.toLocaleString()}`}
                />
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] text-[var(--color-muted-foreground)] mb-2">盈亏热力图</p>
            <HeatMap
              data={portfolio.holdings.map((h) => ({
                label: h.name.slice(0, 4),
                value: h.profit_pct,
              }))}
            />
          </div>

          <div>
            <p className="text-[10px] text-[var(--color-muted-foreground)] mb-2">各持仓盈亏</p>
            <MiniBarChart
              data={portfolio.holdings.map((h) => ({
                label: h.name.slice(0, 4),
                value: h.profit_pct,
                color: h.profit >= 0 ? "#E85D4A" : "#6BBF59",
              }))}
              height={100}
            />
          </div>
        </div>
      )}
    </div>
  );
}
