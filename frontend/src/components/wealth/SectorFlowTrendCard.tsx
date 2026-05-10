import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { SparkLine } from "@/components/charts/SparkLine";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TrendPoint {
  date: string;
  inflow: number;
  change_pct: number;
}

interface SectorTrend {
  name: string;
  total_inflow: number;
}

interface TrendData {
  days: number;
  dates: string[];
  top_sectors: SectorTrend[];
  trends: Record<string, TrendPoint[]>;
}

export function SectorFlowTrendCard() {
  const { data, loading } = useApi<TrendData>(
    () => api.get("/wealth/sector-flow/trends?days=30")
  );

  if (loading || !data || data.top_sectors.length === 0) return null;

  const formatInflow = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1e8) return `${(v / 1e8).toFixed(1)}亿`;
    if (abs >= 1e4) return `${(v / 1e4).toFixed(0)}万`;
    return v.toFixed(0);
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <p className="text-xs font-bold text-[var(--color-muted-foreground)]">🔄 板块资金趋势（近30天）</p>

      <div className="space-y-3">
        {data.top_sectors.slice(0, 6).map((sector) => {
          const trendPoints = data.trends[sector.name] || [];
          const inflows = trendPoints.map((p) => p.inflow);
          const isInflow = sector.total_inflow >= 0;

          if (inflows.length < 2) return null;

          return (
            <div key={sector.name} className="flex items-center gap-3">
              <div className="w-16 shrink-0">
                <p className="text-[11px] font-semibold truncate">{sector.name}</p>
                <p className={`text-[9px] font-bold ${isInflow ? "text-red-500" : "text-green-500"}`}>
                  {isInflow ? "+" : ""}{formatInflow(sector.total_inflow)}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <SparkLine
                  data={inflows}
                  width={200}
                  height={32}
                  color={isInflow ? "#E85D4A" : "#6BBF59"}
                />
              </div>
              <div className="shrink-0">
                {isInflow ? (
                  <TrendingUp size={12} className="text-red-500" />
                ) : (
                  <TrendingDown size={12} className="text-green-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-[var(--color-muted-foreground)] text-center">
        基于 {data.dates.length} 个交易日数据
      </p>
    </div>
  );
}
