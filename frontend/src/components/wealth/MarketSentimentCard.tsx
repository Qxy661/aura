import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface IndexItem {
  name: string;
  code: string;
  price: number;
  change_pct: number;
}

interface FlowSummary {
  total_sectors: number;
  inflow_count: number;
  outflow_count: number;
  net_flow: number;
}

interface SectorFlowData {
  type: string;
  flows: unknown[];
  summary: FlowSummary;
}

interface MarketStatus {
  status: string;
  label: string;
  is_trading_day: boolean;
}

function getSentimentLevel(score: number): { label: string; color: string; emoji: string; bg: string } {
  if (score >= 70) return { label: "极度乐观", color: "text-red-600", emoji: "🔥", bg: "bg-red-50" };
  if (score >= 55) return { label: "偏多", color: "text-red-500", emoji: "📈", bg: "bg-red-50" };
  if (score >= 45) return { label: "中性", color: "text-[var(--color-foreground)]", emoji: "➡️", bg: "bg-[var(--color-muted)]" };
  if (score >= 30) return { label: "偏空", color: "text-green-500", emoji: "📉", bg: "bg-green-50" };
  return { label: "极度悲观", color: "text-green-600", emoji: "💚", bg: "bg-green-50" };
}

export function MarketSentimentCard() {
  const { data: indices } = useApi<{ indices: IndexItem[] }>(
    () => api.get("/wealth/market-indices")
  );
  const { data: flowData } = useApi<SectorFlowData>(
    () => api.get("/wealth/sector-flow?type=industry&limit=50")
  );
  const { data: marketStatus } = useApi<MarketStatus>(
    () => api.get("/wealth/sector-flow/market-status")
  );

  if (!indices?.indices?.length || !flowData?.summary) return null;

  // Calculate sentiment score (0-100)
  let score = 50; // neutral baseline

  // Factor 1: Index performance (weight: 30%)
  const indexChanges = indices.indices.map((i) => i.change_pct);
  const avgIndexChange = indexChanges.reduce((a, b) => a + b, 0) / indexChanges.length;
  score += avgIndexChange * 3; // Each 1% = 3 points

  // Factor 2: Sector flow ratio (weight: 40%)
  const { inflow_count, outflow_count, total_sectors } = flowData.summary;
  if (total_sectors > 0) {
    const flowRatio = (inflow_count - outflow_count) / total_sectors;
    score += flowRatio * 20; // Max ±20 points
  }

  // Factor 3: Net flow direction (weight: 30%)
  const netFlow = flowData.summary.net_flow;
  if (netFlow > 0) {
    score += Math.min(10, netFlow / 1e9); // Positive flow adds points
  } else {
    score += Math.max(-10, netFlow / 1e9); // Negative flow subtracts
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  const sentiment = getSentimentLevel(score);
  const isTrading = marketStatus?.status === "trading";

  return (
    <div className={`cute-card p-4 space-y-3 ${sentiment.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-[var(--color-primary)]" />
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">市场情绪</p>
        </div>
        {isTrading && (
          <span className="flex items-center gap-1 text-[9px] text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            交易中
          </span>
        )}
      </div>

      {/* Sentiment gauge */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <span className="text-3xl">{sentiment.emoji}</span>
          <p className={`text-[11px] font-bold mt-1 ${sentiment.color}`}>{sentiment.label}</p>
        </div>
        <div className="flex-1">
          {/* Gauge bar */}
          <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-green-400 via-yellow-400 to-red-400">
            <div
              className="absolute top-0 w-1 h-full bg-white shadow-md rounded-full transition-all duration-500"
              style={{ left: `${score}%`, transform: "translateX(-50%)" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-green-600">悲观</span>
            <span className="text-[8px] text-[var(--color-muted-foreground)]">{score.toFixed(0)}</span>
            <span className="text-[8px] text-red-600">乐观</span>
          </div>
        </div>
      </div>

      {/* Contributing factors */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-1.5 rounded-lg bg-white/60">
          <p className="text-[8px] text-[var(--color-muted-foreground)]">指数</p>
          <div className="flex items-center justify-center gap-0.5">
            {avgIndexChange >= 0 ? (
              <TrendingUp size={10} className="text-red-500" />
            ) : (
              <TrendingDown size={10} className="text-green-500" />
            )}
            <span className={`text-[10px] font-bold ${avgIndexChange >= 0 ? "text-red-500" : "text-green-500"}`}>
              {avgIndexChange >= 0 ? "+" : ""}{avgIndexChange.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="p-1.5 rounded-lg bg-white/60">
          <p className="text-[8px] text-[var(--color-muted-foreground)]">板块</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-[10px] font-bold text-red-500">{inflow_count}</span>
            <Minus size={8} className="text-[var(--color-muted-foreground)]" />
            <span className="text-[10px] font-bold text-green-500">{outflow_count}</span>
          </div>
        </div>
        <div className="p-1.5 rounded-lg bg-white/60">
          <p className="text-[8px] text-[var(--color-muted-foreground)]">资金流</p>
          <span className={`text-[10px] font-bold ${netFlow >= 0 ? "text-red-500" : "text-green-500"}`}>
            {netFlow >= 0 ? "+" : ""}{Math.abs(netFlow) >= 1e8 ? `${(netFlow / 1e8).toFixed(1)}亿` : `${(netFlow / 1e4).toFixed(0)}万`}
          </span>
        </div>
      </div>
    </div>
  );
}
