import { useState, useEffect } from "react";
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
import { RebalanceCard } from "@/components/wealth/RebalanceCard";
import { BehaviorCard } from "@/components/wealth/BehaviorCard";
import { SectorFlowCard } from "@/components/wealth/SectorFlowCard";
import { MarketIndexBar } from "@/components/wealth/MarketIndexBar";
import { PortfolioHeader } from "@/components/wealth/PortfolioHeader";
import { QuickActionBar } from "@/components/wealth/QuickActionBar";
import { ActionOverlay } from "@/components/wealth/ActionOverlay";
import { PortfolioPerformanceCard } from "@/components/wealth/PortfolioPerformanceCard";
import { SectorFlowTrendCard } from "@/components/wealth/SectorFlowTrendCard";
import { DailyBriefCard } from "@/components/wealth/DailyBriefCard";
import { PortfolioAlertCard } from "@/components/wealth/PortfolioAlertCard";
import { HoldingCompareCard } from "@/components/wealth/HoldingCompareCard";
import { SectorAllocationCard } from "@/components/wealth/SectorAllocationCard";
import { MarketSentimentCard } from "@/components/wealth/MarketSentimentCard";
import { PortfolioHealthCard } from "@/components/wealth/PortfolioHealthCard";
import { WatchlistCard } from "@/components/wealth/WatchlistCard";
import { DcaCalculatorCard } from "@/components/wealth/DcaCalculatorCard";
import { AlertManagerCard } from "@/components/wealth/AlertManagerCard";
import { TransactionOverviewCard } from "@/components/wealth/TransactionOverviewCard";
import { SectorHeatMapCard } from "@/components/wealth/SectorHeatMapCard";
import { FundResearchCard } from "@/components/wealth/FundResearchCard";
import { PortfolioExportCard } from "@/components/wealth/PortfolioExportCard";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Plus, SlidersHorizontal, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";

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

interface Allocation {
  items: { id: number; name: string; code: string; asset_type: string; market_value: number; pct: number }[];
  total: number;
}

export default function WealthPage() {
  const { showSuccess, showError, ToastContainer } = useToast();
  const { data: holdings, refetch: refetchHoldings, loading: holdingsLoading } = useApi<Holding[]>(
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
  const [activeTab, setActiveTab] = useState<"holdings" | "flow" | "insights" | "reports">("holdings");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"created_at" | "profit_pct" | "market_value" | "name">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [overlayContent, setOverlayContent] = useState<"ocr" | "rebalance" | "behavior" | "dca" | "alerts" | "research" | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(true);

  // Auto-check price alerts on page load
  useEffect(() => {
    const checkOnLoad = async () => {
      try {
        const res = await api.post("/wealth/alerts/check");
        if (res.triggered && res.triggered.length > 0) {
          const names = res.triggered.map((t: { holding_name: string }) => t.holding_name).join("、");
          showSuccess(`价格提醒触发: ${names}`);
        }
      } catch {
        // silently ignore — alerts are optional
      }
    };
    checkOnLoad();
  }, []);

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
    { key: "flow" as const, label: "资金流", emoji: "💰" },
    { key: "insights" as const, label: "观点", emoji: "💬" },
    { key: "reports" as const, label: "复盘", emoji: "📝" },
  ];

  const assetTypes = [
    { key: null, label: "全部" },
    { key: "fund", label: "基金" },
    { key: "stock", label: "股票" },
    { key: "us_stock", label: "美股" },
    { key: "crypto", label: "加密" },
  ];

  const sortOptions = [
    { key: "created_at" as const, label: "添加时间" },
    { key: "profit_pct" as const, label: "盈亏比例" },
    { key: "market_value" as const, label: "市值" },
    { key: "name" as const, label: "名称" },
  ];

  const filteredHoldings = (holdings ?? [])
    .filter((h) => !filterType || h.asset_type === filterType)
    .sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortBy === "created_at") {
        return sortOrder === "asc"
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const aData = portfolio?.holdings.find((ph) => ph.id === a.id);
      const bData = portfolio?.holdings.find((ph) => ph.id === b.id);
      const aVal = sortBy === "profit_pct" ? (aData?.profit_pct ?? 0) : (aData?.market_value ?? 0);
      const bVal = sortBy === "profit_pct" ? (bData?.profit_pct ?? 0) : (bData?.market_value ?? 0);
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

  const hasPortfolio = portfolio && portfolio.holdings.length > 0;

  return (
    <div className="space-y-4 fade-in-up">
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
          <MarketIndexBar />
          <MarketSentimentCard />

          {hasPortfolio && (
            <PortfolioHeader
              portfolio={portfolio}
              allocation={allocation ?? null}
              loading={portfolioLoading}
              onRefresh={() => { refetchPortfolio(); refetchHoldings(); }}
            />
          )}

          {/* Analysis section toggle */}
          {hasPortfolio && (
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="w-full flex items-center justify-between cute-card p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <BarChart2 size={11} className="text-[var(--color-primary)]" />
                <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                  分析面板 {showAnalysis ? "· 收起" : "· 展开"}
                </span>
              </div>
              {showAnalysis ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          )}

          {hasPortfolio && showAnalysis && (
            <div className="space-y-3 fade-in-up">
              <PortfolioAlertCard />
              <PortfolioPerformanceCard />
              <SectorFlowTrendCard />
              <HoldingCompareCard />
              <SectorAllocationCard />
              <PortfolioHealthCard />
              <WatchlistCard onSuccess={showSuccess} onError={showError} onConvert={() => { refetchHoldings(); refetchPortfolio(); }} />
              <TransactionOverviewCard />
              <PortfolioExportCard onSuccess={showSuccess} onError={showError} />
            </div>
          )}

          {!hasPortfolio && (
            <WatchlistCard onSuccess={showSuccess} onError={showError} onConvert={() => { refetchHoldings(); refetchPortfolio(); }} />
          )}

          {hasPortfolio && (
            <QuickActionBar
              onAdd={() => setShowAdd(true)}
              onOcr={() => setOverlayContent("ocr")}
              onRebalance={() => setOverlayContent("rebalance")}
              onBehavior={() => setOverlayContent("behavior")}
              onDca={() => setOverlayContent("dca")}
              onAlerts={() => setOverlayContent("alerts")}
              onResearch={() => setOverlayContent("research")}
            />
          )}

          {/* Sort & Filter (compact) */}
          {holdings && holdings.length > 0 && (
            <div className="cute-card p-2.5 space-y-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-accent-foreground)]"
              >
                <SlidersHorizontal size={11} />
                {filterType ? assetTypes.find((t) => t.key === filterType)?.label : "全部"}
                {" · "}
                {sortOptions.find((o) => o.key === sortBy)?.label}
                {sortOrder === "asc" ? "↑" : "↓"}
                {showFilters ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {showFilters && (
                <div className="space-y-2 fade-in-up">
                  <div className="flex gap-1.5 flex-wrap">
                    {assetTypes.map((t) => (
                      <button
                        key={t.key ?? "all"}
                        onClick={() => setFilterType(t.key)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border ${
                          filterType === t.key
                            ? "border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                            : "border-transparent bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="cute-input text-[10px] py-1 flex-1"
                    >
                      {sortOptions.map((o) => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="btn-soft text-[10px] px-2 py-1"
                    >
                      {sortOrder === "asc" ? "↑ 升序" : "↓ 降序"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {holdingsLoading ? (
            <ListSkeleton count={2} />
          ) : filteredHoldings.length === 0 && !showAdd ? (
            <div className="cute-card p-8 text-center">
              <div className="text-4xl mb-3">🐶</div>
              <p className="text-sm text-[var(--color-muted-foreground)] font-medium">还没有持仓记录</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary text-xs mt-4">
                <Plus size={13} className="inline mr-1" /> 手动添加
              </button>
            </div>
          ) : (
            <>
              {filteredHoldings.map((h, i) => (
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
              ) : !hasPortfolio && (
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

      {/* Sector Fund Flow Tab */}
      {activeTab === "flow" && (
        <div className="space-y-3">
          <SectorHeatMapCard />
          <SectorFlowCard />
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === "insights" && (
        <InsightPanel insights={insights ?? []} onRefresh={refetchInsights} onError={showError} />
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          <DailyBriefCard />
          <ReportPanel reports={reports ?? []} onRefresh={refetchReports} onError={showError} />
        </div>
      )}

      {/* Action Overlays */}
      {overlayContent === "ocr" && (
        <ActionOverlay title="OCR 导入持仓" onClose={() => setOverlayContent(null)}>
          <OcrUploader
            onImported={() => { setOverlayContent(null); refetchHoldings(); refetchPortfolio(); showSuccess("持仓已导入"); }}
            onError={showError}
          />
        </ActionOverlay>
      )}
      {overlayContent === "rebalance" && (
        <ActionOverlay title="AI 再平衡" onClose={() => setOverlayContent(null)}>
          <RebalanceCard />
        </ActionOverlay>
      )}
      {overlayContent === "behavior" && (
        <ActionOverlay title="AI 行为分析" onClose={() => setOverlayContent(null)}>
          <BehaviorCard />
        </ActionOverlay>
      )}
      {overlayContent === "dca" && (
        <ActionOverlay title="定投计算器" onClose={() => setOverlayContent(null)}>
          <DcaCalculatorCard />
        </ActionOverlay>
      )}
      {overlayContent === "alerts" && (
        <ActionOverlay title="价格提醒" onClose={() => setOverlayContent(null)}>
          <AlertManagerCard
            holdings={(holdings ?? []).map((h) => ({ id: h.id, name: h.name, code: h.code }))}
            onSuccess={showSuccess}
            onError={showError}
          />
        </ActionOverlay>
      )}
      {overlayContent === "research" && (
        <ActionOverlay title="基金研究" onClose={() => setOverlayContent(null)}>
          <FundResearchCard
            onSuccess={showSuccess}
            onError={showError}
            onWatchlist={() => {}}
            onBuy={() => { refetchHoldings(); refetchPortfolio(); }}
          />
        </ActionOverlay>
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
