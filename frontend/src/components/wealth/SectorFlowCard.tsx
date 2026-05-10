import { useState, useEffect, useRef, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface SectorItem {
  code: string;
  name: string;
  price: number;
  change_pct: number;
  main_net_inflow: number;
  main_net_inflow_pct: number;
  super_large_net_inflow: number;
  super_large_net_inflow_pct: number;
  large_net_inflow: number;
  large_net_inflow_pct: number;
  medium_net_inflow: number;
  medium_net_inflow_pct: number;
  small_net_inflow: number;
  small_net_inflow_pct: number;
}

interface FlowSummary {
  total_sectors: number;
  inflow_count: number;
  outflow_count: number;
  total_inflow: number;
  total_outflow: number;
  net_flow: number;
  top_inflow: SectorItem[];
  top_outflow: SectorItem[];
}

interface SectorFlowData {
  type: string;
  flows: SectorItem[];
  summary: FlowSummary;
}

interface MarketStatus {
  status: "trading" | "break" | "closed" | "pre_market";
  label: string;
  is_trading_day: boolean;
  time: string;
}

interface DailySummaryData {
  date: string;
  summary: string | null;
  net_inflow_count: number;
  net_outflow_count: number;
  total_net_flow: number;
  created_at: string;
}

function formatYi(value: number): string {
  const yi = value / 1e8;
  if (Math.abs(yi) >= 1) return `${yi >= 0 ? "+" : ""}${yi.toFixed(2)}亿`;
  const wan = value / 1e4;
  return `${wan >= 0 ? "+" : ""}${wan.toFixed(0)}万`;
}

function formatShortYi(value: number): string {
  const yi = value / 1e8;
  return `${yi >= 0 ? "+" : ""}${yi.toFixed(2)}`;
}

/** Market status badge */
function MarketStatusBadge({ status }: { status: MarketStatus | null }) {
  if (!status) return null;

  const colorMap: Record<string, string> = {
    trading: "bg-green-500",
    break: "bg-yellow-500",
    closed: "bg-gray-400",
    pre_market: "bg-blue-400",
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${colorMap[status.status] ?? "bg-gray-400"}`}>
        {status.status === "trading" && (
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
        )}
      </div>
      <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
        {status.label} {status.time}
      </span>
    </div>
  );
}

/** Horizontal bar for a single sector */
function FlowBar({
  item,
  maxAbs,
  type,
}: {
  item: SectorItem;
  maxAbs: number;
  type: "inflow" | "outflow";
}) {
  const pct = maxAbs > 0 ? (Math.abs(item.main_net_inflow) / maxAbs) * 100 : 0;
  const isInflow = type === "inflow";

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="w-16 text-right">
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            item.change_pct >= 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
          }`}
        >
          {item.change_pct >= 0 ? "+" : ""}
          {item.change_pct.toFixed(2)}%
        </span>
      </div>
      <div className="flex-1 relative">
        <div className="h-5 bg-[var(--color-muted)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out flex items-center ${
              isInflow ? "bg-red-400/80" : "bg-green-400/80"
            }`}
            style={{ width: `${Math.max(pct, 8)}%` }}
          >
            <span className="text-[9px] font-bold text-white pl-1.5 whitespace-nowrap">
              {formatShortYi(item.main_net_inflow)}
            </span>
          </div>
        </div>
      </div>
      <div className="w-20 truncate">
        <span className="text-[11px] font-semibold text-[var(--color-foreground)]">
          {item.name}
        </span>
      </div>
    </div>
  );
}

/** Heat map grid */
function FlowHeatMap({ items }: { items: SectorItem[] }) {
  function getBgColor(val: number): string {
    if (val > 3e8) return "#C53030";
    if (val > 1e8) return "#E85D4A";
    if (val > 0) return "#FEB2B2";
    if (val === 0) return "#EDF2F7";
    if (val > -1e8) return "#C6F6D5";
    if (val > -3e8) return "#68D391";
    return "#38A169";
  }

  function getTextColor(val: number): string {
    if (Math.abs(val) > 1e8) return "white";
    return "var(--color-foreground)";
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.code}
          className="rounded-lg p-2 text-center transition-transform hover:scale-105"
          style={{
            backgroundColor: getBgColor(item.main_net_inflow),
            color: getTextColor(item.main_net_inflow),
          }}
        >
          <p className="text-[10px] font-bold truncate">{item.name}</p>
          <p className="text-xs font-extrabold mt-0.5">
            {formatShortYi(item.main_net_inflow)}亿
          </p>
          <p className="text-[9px] opacity-80">
            {item.change_pct >= 0 ? "+" : ""}
            {item.change_pct.toFixed(2)}%
          </p>
        </div>
      ))}
    </div>
  );
}

/** Sector rotation signals */
function SignalPanel({ industry, concept }: { industry: FlowSummary; concept: FlowSummary }) {
  const signals: { icon: string; text: string; type: "warn" | "info" | "good" }[] = [];

  // Check if market is overall bullish/bearish
  if (industry.net_flow > 5e9) {
    signals.push({ icon: "🚀", text: `行业板块整体净流入${formatYi(industry.net_flow)}，多头强势`, type: "good" });
  } else if (industry.net_flow < -5e9) {
    signals.push({ icon: "🔻", text: `行业板块整体净流出${formatYi(Math.abs(industry.net_flow))}，空头主导`, type: "warn" });
  }

  // Check sector concentration
  if (industry.top_inflow.length > 0) {
    const topInflow = industry.top_inflow[0];
    const totalInflow = industry.total_inflow;
    if (totalInflow > 0 && topInflow.main_net_inflow / totalInflow > 0.3) {
      signals.push({
        icon: "🎯",
        text: `资金高度集中于「${topInflow.name}」，占比超30%`,
        type: "info",
      });
    }
  }

  // Check concept vs industry divergence
  if (concept.net_flow > 3e9 && industry.net_flow < -3e9) {
    signals.push({ icon: "⚡", text: "概念热、行业冷——题材炒作迹象", type: "warn" });
  } else if (industry.net_flow > 3e9 && concept.net_flow < -3e9) {
    signals.push({ icon: "📊", text: "行业强、概念弱——基本面驱动行情", type: "info" });
  }

  // Large super-large order divergence
  if (industry.top_inflow.length > 0) {
    const top = industry.top_inflow[0];
    if (top.super_large_net_inflow > 0 && top.large_net_inflow < 0) {
      signals.push({
        icon: "🐋",
        text: `「${top.name}」超大单流入但大单流出，机构分歧`,
        type: "warn",
      });
    }
  }

  if (signals.length === 0) return null;

  const colorMap = {
    warn: "bg-orange-50 border-orange-200 text-orange-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
    good: "bg-green-50 border-green-200 text-green-700",
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <AlertTriangle size={11} className="text-[var(--color-accent-foreground)]" />
        <p className="text-[11px] font-bold text-[var(--color-accent-foreground)]">智能信号</p>
      </div>
      {signals.map((s, i) => (
        <div
          key={i}
          className={`flex items-start gap-1.5 p-2 rounded-lg border text-[10px] font-medium ${colorMap[s.type]}`}
        >
          <span>{s.icon}</span>
          <span>{s.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Daily summary card */
function DailySummaryCard() {
  const { data, loading } = useApi<DailySummaryData>(
    () => api.get("/wealth/sector-flow/daily-summary")
  );

  if (loading) return <Skeleton className="h-20" />;
  if (!data?.summary) return null;

  return (
    <div className="cute-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-[var(--color-accent-foreground)]" />
          <p className="text-[11px] font-bold text-[var(--color-accent-foreground)]">
            {data.date} 收盘总结
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-green-600 font-semibold">
            +{data.net_inflow_count}流入
          </span>
          <span className="text-[9px] text-red-600 font-semibold">
            -{data.net_outflow_count}流出
          </span>
        </div>
      </div>
      <div className="text-[11px] leading-relaxed text-[var(--color-foreground)] whitespace-pre-line">
        {data.summary}
      </div>
    </div>
  );
}

export function SectorFlowCard() {
  const [sectorType, setSectorType] = useState<"industry" | "concept">("industry");
  const [viewMode, setViewMode] = useState<"bars" | "heatmap">("bars");
  const [showSummary, setShowSummary] = useState(true);
  const [showSignals, setShowSignals] = useState(true);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const {
    data: flowData,
    loading: flowLoading,
    refetch: refetchFlow,
  } = useApi<SectorFlowData>(
    () => api.get(`/wealth/sector-flow?type=${sectorType}&limit=30`),
    [sectorType]
  );

  const { data: marketStatus } = useApi<MarketStatus>(
    () => api.get("/wealth/sector-flow/market-status")
  );

  // Industry summary for signals (always fetch both)
  const { data: industryFlowData } = useApi<SectorFlowData>(
    () => api.get("/wealth/sector-flow?type=industry&limit=30")
  );
  const { data: conceptFlowData } = useApi<SectorFlowData>(
    () => api.get("/wealth/sector-flow?type=concept&limit=30")
  );

  // Auto-refresh during trading hours
  const startAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    autoRefreshRef.current = setInterval(
      () => {
        refetchFlow();
        setLastUpdate(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
      },
      5 * 60 * 1000
    );
  }, [refetchFlow]);

  useEffect(() => {
    if (marketStatus?.status === "trading") {
      startAutoRefresh();
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [marketStatus?.status, startAutoRefresh]);

  const handleRefresh = () => {
    refetchFlow();
    setLastUpdate(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
  };

  const tabs = [
    { key: "industry" as const, label: "行业板块" },
    { key: "concept" as const, label: "概念板块" },
  ];

  const summary = flowData?.summary;

  return (
    <div className="space-y-3">
      {/* Main flow card */}
      <div className="cute-card p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-[var(--color-muted-foreground)]">
              💰 主力资金流向
            </p>
            <MarketStatusBadge status={marketStatus ?? null} />
          </div>
          <div className="flex items-center gap-1.5">
            {lastUpdate && (
              <span className="text-[9px] text-[var(--color-muted-foreground)]">
                {lastUpdate}
              </span>
            )}
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
              title="刷新"
            >
              <RefreshCw size={12} className={flowLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        {marketStatus?.status === "trading" && (
          <div className="flex items-center gap-1 text-[9px] text-green-600 font-medium">
            <Radio size={9} className="animate-pulse" />
            交易时段自动刷新（每5分钟）
          </div>
        )}

        {/* Sector type tabs */}
        <div className="flex gap-1.5 bg-[var(--color-muted)] rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSectorType(tab.key)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                sectorType === tab.key
                  ? "bg-white text-[var(--color-foreground)] shadow-sm"
                  : "text-[var(--color-muted-foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {flowLoading && !flowData ? (
          <Skeleton className="h-40" />
        ) : summary ? (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-red-50 text-center">
                <p className="text-[9px] text-red-400 font-semibold">净流入板块</p>
                <p className="text-sm font-extrabold text-red-600">{summary.inflow_count}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--color-muted)] text-center">
                <p className="text-[9px] text-[var(--color-muted-foreground)] font-semibold">
                  全市场净流入
                </p>
                <p
                  className={`text-sm font-extrabold ${
                    summary.net_flow >= 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatYi(summary.net_flow)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-green-50 text-center">
                <p className="text-[9px] text-green-400 font-semibold">净流出板块</p>
                <p className="text-sm font-extrabold text-green-600">{summary.outflow_count}</p>
              </div>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === "bars" ? "heatmap" : "bars")}
                className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent-foreground)]"
              >
                {viewMode === "bars" ? "🎨 热力图" : "📊 排行"} <ChevronDown size={10} />
              </button>
            </div>

            {viewMode === "bars" ? (
              <div className="space-y-3">
                {summary.top_inflow.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <ArrowUpRight size={12} className="text-red-500" />
                      <p className="text-[11px] font-bold text-red-500">主力净流入 TOP 10</p>
                    </div>
                    <div className="space-y-0.5">
                      {summary.top_inflow.slice(0, 10).map((item) => (
                        <FlowBar
                          key={item.code}
                          item={item}
                          maxAbs={
                            summary.top_inflow.length > 0
                              ? Math.abs(summary.top_inflow[0].main_net_inflow)
                              : 1
                          }
                          type="inflow"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {summary.top_outflow.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <ArrowDownRight size={12} className="text-green-500" />
                      <p className="text-[11px] font-bold text-green-500">主力净流出 TOP 10</p>
                    </div>
                    <div className="space-y-0.5">
                      {summary.top_outflow.slice(0, 10).map((item) => (
                        <FlowBar
                          key={item.code}
                          item={item}
                          maxAbs={
                            summary.top_outflow.length > 0
                              ? Math.abs(summary.top_outflow[0].main_net_inflow)
                              : 1
                          }
                          type="outflow"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <FlowHeatMap items={flowData?.flows ?? []} />
            )}
          </>
        ) : (
          <div className="text-center py-6 text-[var(--color-muted-foreground)] text-xs">
            暂无数据
          </div>
        )}
      </div>

      {/* Signals panel */}
      {industryFlowData?.summary && conceptFlowData?.summary && (
        <div className="cute-card p-4">
          <button
            onClick={() => setShowSignals(!showSignals)}
            className="flex items-center gap-1 w-full text-left"
          >
            <TrendingUp size={12} className="text-[var(--color-accent-foreground)]" />
            <span className="text-[11px] font-bold text-[var(--color-accent-foreground)] flex-1">
              智能信号
            </span>
            {showSignals ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          {showSignals && (
            <div className="mt-2">
              <SignalPanel
                industry={industryFlowData.summary}
                concept={conceptFlowData.summary}
              />
            </div>
          )}
        </div>
      )}

      {/* Daily summary */}
      <div className="cute-card p-4">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="flex items-center gap-1 w-full text-left"
        >
          <Clock size={12} className="text-[var(--color-accent-foreground)]" />
          <span className="text-[11px] font-bold text-[var(--color-accent-foreground)] flex-1">
            收盘总结
          </span>
          {showSummary ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        {showSummary && (
          <div className="mt-2">
            <DailySummaryCard />
          </div>
        )}
      </div>
    </div>
  );
}
