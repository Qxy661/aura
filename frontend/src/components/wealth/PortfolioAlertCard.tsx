import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { AlertTriangle, TrendingUp, TrendingDown, Target, Layers } from "lucide-react";

interface PortfolioHolding {
  id: number;
  name: string;
  code: string;
  asset_type: string;
  market_value: number;
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

interface Alert {
  type: "danger" | "warning" | "success" | "info";
  icon: React.ReactNode;
  title: string;
  message: string;
}

function generateAlerts(portfolio: Portfolio): Alert[] {
  const alerts: Alert[] = [];
  const { holdings, total_market } = portfolio;

  if (!holdings.length || total_market <= 0) return alerts;

  // 1. Big winners / losers (>10% change today)
  for (const h of holdings) {
    if (h.change_pct >= 5) {
      alerts.push({
        type: "success",
        icon: <TrendingUp size={12} />,
        title: `${h.name} 大涨`,
        message: `今日涨幅 ${h.change_pct.toFixed(2)}%，市值 ¥${h.market_value.toLocaleString()}`,
      });
    } else if (h.change_pct <= -5) {
      alerts.push({
        type: "danger",
        icon: <TrendingDown size={12} />,
        title: `${h.name} 大跌`,
        message: `今日跌幅 ${h.change_pct.toFixed(2)}%，注意风险`,
      });
    }
  }

  // 2. Concentration risk (>40% in single holding)
  for (const h of holdings) {
    const pct = (h.market_value / total_market) * 100;
    if (pct > 40) {
      alerts.push({
        type: "warning",
        icon: <Target size={12} />,
        title: "集中度过高",
        message: `${h.name} 占比 ${pct.toFixed(1)}%，建议分散投资`,
      });
    }
  }

  // 3. Deep loss alert (>20% loss)
  for (const h of holdings) {
    if (h.profit_pct < -20) {
      alerts.push({
        type: "danger",
        icon: <AlertTriangle size={12} />,
        title: `${h.name} 深度亏损`,
        message: `累计亏损 ${h.profit_pct.toFixed(1)}%，考虑止损或补仓`,
      });
    }
  }

  // 4. Sector concentration (multiple holdings in same asset type >60%)
  const byType: Record<string, number> = {};
  for (const h of holdings) {
    byType[h.asset_type] = (byType[h.asset_type] || 0) + h.market_value;
  }
  for (const [type, value] of Object.entries(byType)) {
    const pct = (value / total_market) * 100;
    if (pct > 60 && holdings.length > 1) {
      const typeLabels: Record<string, string> = {
        fund: "基金", stock: "股票", a_share: "A股", us_stock: "美股", crypto: "加密货币",
      };
      alerts.push({
        type: "warning",
        icon: <Layers size={12} />,
        title: "资产类型集中",
        message: `${typeLabels[type] || type} 占比 ${pct.toFixed(1)}%，建议跨资产配置`,
      });
    }
  }

  // 5. Big profit alert (>30% gain)
  for (const h of holdings) {
    if (h.profit_pct > 30) {
      alerts.push({
        type: "success",
        icon: <TrendingUp size={12} />,
        title: `${h.name} 盈利丰厚`,
        message: `累计收益 ${h.profit_pct.toFixed(1)}%，考虑分批止盈`,
      });
    }
  }

  // Limit to 5 most important alerts
  const priority = { danger: 0, warning: 1, success: 2, info: 3 };
  alerts.sort((a, b) => priority[a.type] - priority[b.type]);
  return alerts.slice(0, 5);
}

const typeStyles: Record<string, string> = {
  danger: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  success: "bg-green-50 border-green-200 text-green-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

export function PortfolioAlertCard() {
  const { data: portfolio } = useApi<Portfolio>(
    () => api.get("/wealth/portfolio")
  );

  if (!portfolio || portfolio.holdings.length === 0) return null;

  const alerts = generateAlerts(portfolio);
  if (alerts.length === 0) return null;

  return (
    <div className="cute-card p-4 space-y-2">
      <div className="flex items-center gap-1.5">
        <AlertTriangle size={12} className="text-amber-500" />
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">智能提醒</p>
      </div>

      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 p-2.5 rounded-xl border ${typeStyles[alert.type]}`}
          >
            <span className="mt-0.5 shrink-0">{alert.icon}</span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold">{alert.title}</p>
              <p className="text-[10px] opacity-80">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
