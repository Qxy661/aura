import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { HoldingCard } from "@/components/wealth/HoldingCard";
import { HoldingForm } from "@/components/wealth/HoldingForm";
import { OcrUploader } from "@/components/wealth/OcrUploader";
import { InsightPanel } from "@/components/wealth/InsightPanel";
import { ReportPanel } from "@/components/wealth/ReportPanel";
import { PieChart } from "@/components/charts/PieChart";
import { HeatMap } from "@/components/charts/HeatMap";
import { NumberRoller } from "@/components/wealth/NumberRoller";
import { Plus, TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { MiniBarChart } from "@/components/charts/MiniBarChart";

interface Holding {
  id: number;
  name: string;
  code: string;
  asset_type: string;
  cost_price: number;
  shares: number;
  created_at: string;
}

interface PortfolioHolding extends Holding {
  current_price: number;
  market_value: number;
  cost_value: number;
  profit: number;
  profit_pct: number;
  change_pct: number;
}

interface Portfolio {
  holdings: PortfolioHolding[];
  total_cost: number;
  total_market: number;
  total_profit: number;
  total_profit_pct: number;
}

interface Insight {
  id: number;
  content: string;
  source: string;
  tags: string;
  created_at: string;
}

interface Report {
  id: number;
  report_content: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

interface AllocationItem {
  id: number;
  name: string;
  code: string;
  asset_type: string;
  market_value: number;
  pct: number;
}

interface Allocation {
  items: AllocationItem[];
  total: number;
}

export default function WealthPage() {
  const { showSuccess, showError, ToastContainer } = useToast();
  const { data: holdings, refetch: refetchHoldings } = useApi<Holding[]>(
    () => api.get("/wealth/holdings")
  );
  const { data: insights, refetch: refetchInsights } = useApi<Insight[]>(
    () => api.get("/wealth/insights")
  );
  const { data: reports, refetch: refetchReports } = useApi<Report[]>(
    () => api.get("/wealth/reports")
  );

  const { data: portfolio, refetch: refetchPortfolio, loading: portfolioLoading } = useApi<Portfolio>(
    () => api.get("/wealth/portfolio")
  );
  const { data: allocation } = useApi<Allocation>(
    () => api.get("/wealth/allocation")
  );

  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<"holdings" | "insights" | "reports">("holdings");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [showCharts, setShowCharts] = useState(true);

  const deleteHolding = async (id: number) => {
    try {
      await api.del(`/wealth/holdings/${id}`);
      showSuccess("持仓已删除");
      refetchHoldings();
      refetchPortfolio();
    } catch (e) {
      showError(e instanceof Error ? e.message : "删除失败");
    }
  };

  const tabs = [
    { key: "holdings" as const, label: "持仓", emoji: "📊" },
    { key: "insights" as const, label: "观点", emoji: "💬" },
    { key: "reports" as const, label: "复盘", emoji: "📝" },
  ];

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader title="财富面板" subtitle="持仓 · 观点 · AI 复盘" mascotMood="happy" />

      {/* Tab switcher */}
      <div className="flex gap-2 bg-[var(--color-muted)] rounded-2xl p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.key
                ? "bg-white text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Holdings Tab */}
      {activeTab === "holdings" && (
        <div className="space-y-3">
          {/* Portfolio Overview */}
          {portfolio && portfolio.holdings.length > 0 && (
            <div className="cute-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[var(--color-muted-foreground)]">📊 组合概览</p>
                <button
                  onClick={() => { refetchPortfolio(); refetchHoldings(); }}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
                  title="刷新行情"
                >
                  <RefreshCw size={12} className={portfolioLoading ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--color-muted)]">
                  <p className="text-[10px] text-[var(--color-muted-foreground)]">总市值</p>
                  <NumberRoller value={portfolio.total_market} prefix="¥" decimals={0} className="text-sm" />
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-muted)]">
                  <p className="text-[10px] text-[var(--color-muted-foreground)]">总成本</p>
                  <NumberRoller value={portfolio.total_cost} prefix="¥" decimals={0} className="text-sm" />
                </div>
              </div>

              <div className={`p-3 rounded-xl ${portfolio.total_profit >= 0 ? "bg-red-50" : "bg-green-50"}`}>
                <div className="flex items-center gap-2">
                  {portfolio.total_profit >= 0 ? (
                    <TrendingUp size={16} className="text-red-500" />
                  ) : (
                    <TrendingDown size={16} className="text-green-500" />
                  )}
                  <div>
                    <NumberRoller
                      value={portfolio.total_profit}
                      prefix={portfolio.total_profit >= 0 ? "+¥" : "-¥"}
                      decimals={0}
                      className="text-lg"
                      colorize
                    />
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
              </div>

              {/* Charts toggle */}
              <button
                onClick={() => setShowCharts(!showCharts)}
                className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent-foreground)]"
              >
                📈 可视化图表 {showCharts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showCharts && (
                <div className="space-y-4">
                  {/* Pie chart: allocation */}
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

                  {/* HeatMap: P&L */}
                  <div>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] mb-2">盈亏热力图</p>
                    <HeatMap
                      data={portfolio.holdings.map((h) => ({
                        label: h.name.slice(0, 4),
                        value: h.profit_pct,
                      }))}
                    />
                  </div>

                  {/* Per-holding P&L bar chart */}
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
          )}

          <OcrUploader onImported={() => { refetchHoldings(); refetchPortfolio(); showSuccess("持仓已导入"); }} onError={showError} />

          {(holdings ?? []).length === 0 && !showAdd ? (
            <div className="cute-card p-8 text-center">
              <div className="text-4xl mb-3">🐶</div>
              <p className="text-sm text-[var(--color-muted-foreground)] font-medium">还没有持仓记录</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary text-xs mt-4">
                <Plus size={13} className="inline mr-1" /> 手动添加
              </button>
            </div>
          ) : (
            <>
              {(holdings ?? []).map((h, i) => (
                <HoldingCard
                  key={h.id}
                  holding={h}
                  index={i}
                  onDelete={(id) => setConfirmDelete(id)}
                  onUpdated={() => { refetchHoldings(); refetchPortfolio(); }}
                  onError={showError}
                  marketData={portfolio?.holdings.find((ph) => ph.id === h.id)}
                />
              ))}

              {showAdd ? (
                <HoldingForm
                  onSaved={() => { setShowAdd(false); refetchHoldings(); }}
                  onCancel={() => setShowAdd(false)}
                  onError={showError}
                />
              ) : (
                <button
                  onClick={() => setShowAdd(true)}
                  className="w-full cute-card p-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  <Plus size={14} /> 手动添加
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === "insights" && (
        <InsightPanel insights={insights ?? []} onRefresh={refetchInsights} onError={showError} />
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <ReportPanel reports={reports ?? []} onRefresh={refetchReports} onError={showError} />
      )}

      <ToastContainer />

      {confirmDelete !== null && (
        <ConfirmDialog
          title="删除持仓"
          message="确定要删除这条持仓记录吗？此操作不可撤销。"
          confirmLabel="删除"
          destructive
          onConfirm={() => { deleteHolding(confirmDelete); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
