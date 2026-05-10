import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { HeatMap } from "@/components/charts/HeatMap";
import { Grid3X3, TrendingUp, TrendingDown } from "lucide-react";

interface SectorItem {
  code: string;
  name: string;
  price: number;
  change_pct: number;
  main_net_inflow: number;
  main_net_inflow_pct: number;
}

interface SectorFlowData {
  type: string;
  flows: SectorItem[];
  summary: {
    total_sectors: number;
    inflow_count: number;
    outflow_count: number;
    net_flow: number;
    top_inflow: SectorItem[];
    top_outflow: SectorItem[];
  };
}

export function SectorHeatMapCard() {
  const [flowType, setFlowType] = useState<"industry" | "concept">("industry");
  const { data, loading } = useApi<SectorFlowData>(
    () => api.get(`/wealth/sector-flow?type=${flowType}&limit=50`)
  );

  if (loading) {
    return (
      <div className="cute-card p-4 space-y-3">
        <div className="h-4 w-24 bg-[var(--color-muted)] rounded animate-pulse" />
        <div className="h-40 bg-[var(--color-muted)] rounded animate-pulse" />
      </div>
    );
  }

  if (!data || data.flows.length === 0) return null;

  // Build heat map data: use change_pct for coloring
  const heatData = data.flows.map((s) => ({
    label: s.name,
    value: s.change_pct,
  }));

  // Sort by change_pct for top/bottom lists
  const sorted = [...data.flows].sort((a, b) => b.change_pct - a.change_pct);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse();

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Grid3X3 size={12} className="text-[var(--color-primary)]" />
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">板块热力图</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFlowType("industry")}
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
              flowType === "industry"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
            }`}
          >
            行业
          </button>
          <button
            onClick={() => setFlowType("concept")}
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
              flowType === "concept"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
            }`}
          >
            概念
          </button>
        </div>
      </div>

      {/* Heat Map */}
      <HeatMap data={heatData} />

      {/* Summary bar */}
      <div className="flex items-center justify-between text-[9px] text-[var(--color-muted-foreground)] pt-1 border-t border-[var(--color-border)]">
        <span className="flex items-center gap-1">
          <TrendingUp size={9} className="text-red-500" />
          上涨 {data.summary.inflow_count}
        </span>
        <span className="flex items-center gap-1">
          <TrendingDown size={9} className="text-green-500" />
          下跌 {data.summary.outflow_count}
        </span>
        <span>共 {data.summary.total_sectors} 板块</span>
      </div>

      {/* Top/Bottom movers */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[9px] font-semibold text-red-500 flex items-center gap-0.5">
            <TrendingUp size={9} /> 领涨
          </p>
          {top3.map((s) => (
            <div key={s.code} className="flex items-center justify-between">
              <span className="text-[10px] truncate flex-1">{s.name}</span>
              <span className="text-[10px] font-bold text-red-500 ml-1">
                +{s.change_pct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-semibold text-green-500 flex items-center gap-0.5">
            <TrendingDown size={9} /> 领跌
          </p>
          {bottom3.map((s) => (
            <div key={s.code} className="flex items-center justify-between">
              <span className="text-[10px] truncate flex-1">{s.name}</span>
              <span className="text-[10px] font-bold text-green-500 ml-1">
                {s.change_pct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
