import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { SparkLine } from "@/components/charts/SparkLine";
import { TrendingUp, TrendingDown, Shield, Activity, AlertTriangle } from "lucide-react";

interface PerformancePoint {
  date: string;
  value: number;
}

interface RiskMetrics {
  volatility: number;
  max_drawdown: number;
  sharpe_ratio: number;
  annual_return: number;
  total_days: number;
}

export function PortfolioPerformanceCard() {
  const { data: perf } = useApi<{ series: PerformancePoint[]; total_days: number }>(
    () => api.get("/wealth/portfolio/performance?days=90")
  );
  const { data: risk } = useApi<RiskMetrics>(
    () => api.get("/wealth/portfolio/risk-metrics")
  );

  const series = perf?.series ?? [];
  if (series.length < 2) return null;

  const values = series.map((s) => s.value);
  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const totalReturn = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
  const isUp = totalReturn >= 0;

  const formatValue = (v: number) => {
    if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <p className="text-xs font-bold text-[var(--color-muted-foreground)]">📈 组合走势（近90天）</p>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] text-[var(--color-muted-foreground)]">期间收益</p>
          <p className={`text-lg font-bold ${isUp ? "text-red-500" : "text-green-500"}`}>
            {isUp ? "+" : ""}{totalReturn.toFixed(2)}%
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isUp ? (
            <TrendingUp size={14} className="text-red-500" />
          ) : (
            <TrendingDown size={14} className="text-green-500" />
          )}
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {formatValue(firstVal)} → {formatValue(lastVal)}
          </span>
        </div>
      </div>

      <div className="flex justify-center">
        <SparkLine
          data={values}
          width={300}
          height={80}
          color={isUp ? "#E85D4A" : "#6BBF59"}
          fillColor={isUp ? "#E85D4A" : "#6BBF59"}
        />
      </div>

      <div className="flex justify-between text-[9px] text-[var(--color-muted-foreground)] px-1">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>

      {/* Risk Metrics */}
      {risk && risk.total_days >= 3 && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--color-border)]">
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 mb-1">
              <Activity size={10} className="text-[var(--color-muted-foreground)]" />
              <span className="text-[9px] text-[var(--color-muted-foreground)]">年化波动</span>
            </div>
            <p className="text-xs font-bold">{risk.volatility}%</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 mb-1">
              <AlertTriangle size={10} className="text-[var(--color-muted-foreground)]" />
              <span className="text-[9px] text-[var(--color-muted-foreground)]">最大回撤</span>
            </div>
            <p className="text-xs font-bold text-red-500">-{risk.max_drawdown}%</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 mb-1">
              <Shield size={10} className="text-[var(--color-muted-foreground)]" />
              <span className="text-[9px] text-[var(--color-muted-foreground)]">夏普比率</span>
            </div>
            <p className={`text-xs font-bold ${risk.sharpe_ratio >= 1 ? "text-green-600" : risk.sharpe_ratio >= 0 ? "text-[var(--color-foreground)]" : "text-red-500"}`}>
              {risk.sharpe_ratio}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
