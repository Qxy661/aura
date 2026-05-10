import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { Heart, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface PortfolioHolding {
  id: number;
  name: string;
  market_value: number;
  profit_pct: number;
  asset_type: string;
}

interface Portfolio {
  holdings: PortfolioHolding[];
  total_market: number;
  total_profit_pct: number;
}

interface RiskMetrics {
  volatility: number;
  max_drawdown: number;
  sharpe_ratio: number;
}

interface HealthCheck {
  label: string;
  score: number;
  maxScore: number;
  status: "good" | "warn" | "bad";
  detail: string;
}

function analyzeHealth(portfolio: Portfolio, risk: RiskMetrics | null): HealthCheck[] {
  const checks: HealthCheck[] = [];
  const { holdings, total_market } = portfolio;

  // 1. Diversification (number of holdings)
  const count = holdings.length;
  if (count >= 5) {
    checks.push({ label: "分散度", score: 10, maxScore: 10, status: "good", detail: `${count}个持仓，分散良好` });
  } else if (count >= 3) {
    checks.push({ label: "分散度", score: 6, maxScore: 10, status: "warn", detail: `${count}个持仓，建议增加` });
  } else {
    checks.push({ label: "分散度", score: 3, maxScore: 10, status: "bad", detail: `仅${count}个持仓，风险集中` });
  }

  // 2. Concentration (largest holding %)
  if (total_market > 0) {
    const maxPct = Math.max(...holdings.map((h) => (h.market_value / total_market) * 100));
    if (maxPct < 30) {
      checks.push({ label: "集中度", score: 10, maxScore: 10, status: "good", detail: `最大持仓 ${maxPct.toFixed(1)}%，分布均匀` });
    } else if (maxPct < 50) {
      checks.push({ label: "集中度", score: 6, maxScore: 10, status: "warn", detail: `最大持仓 ${maxPct.toFixed(1)}%，略显集中` });
    } else {
      checks.push({ label: "集中度", score: 2, maxScore: 10, status: "bad", detail: `最大持仓 ${maxPct.toFixed(1)}%，高度集中` });
    }
  }

  // 3. Performance
  const totalReturn = portfolio.total_profit_pct;
  if (totalReturn > 10) {
    checks.push({ label: "收益", score: 10, maxScore: 10, status: "good", detail: `累计 ${totalReturn.toFixed(1)}%，表现优秀` });
  } else if (totalReturn > 0) {
    checks.push({ label: "收益", score: 7, maxScore: 10, status: "good", detail: `累计 ${totalReturn.toFixed(1)}%，正收益` });
  } else if (totalReturn > -10) {
    checks.push({ label: "收益", score: 4, maxScore: 10, status: "warn", detail: `累计 ${totalReturn.toFixed(1)}%，小幅亏损` });
  } else {
    checks.push({ label: "收益", score: 1, maxScore: 10, status: "bad", detail: `累计 ${totalReturn.toFixed(1)}%，需要关注` });
  }

  // 4. Risk (volatility)
  if (risk) {
    if (risk.volatility < 15) {
      checks.push({ label: "波动", score: 10, maxScore: 10, status: "good", detail: `年化 ${risk.volatility}%，波动较低` });
    } else if (risk.volatility < 30) {
      checks.push({ label: "波动", score: 6, maxScore: 10, status: "warn", detail: `年化 ${risk.volatility}%，波动适中` });
    } else {
      checks.push({ label: "波动", score: 2, maxScore: 10, status: "bad", detail: `年化 ${risk.volatility}%，波动较大` });
    }

    // 5. Drawdown
    if (risk.max_drawdown < 10) {
      checks.push({ label: "回撤", score: 10, maxScore: 10, status: "good", detail: `最大回撤 ${risk.max_drawdown}%，控制良好` });
    } else if (risk.max_drawdown < 25) {
      checks.push({ label: "回撤", score: 5, maxScore: 10, status: "warn", detail: `最大回撤 ${risk.max_drawdown}%，需注意` });
    } else {
      checks.push({ label: "回撤", score: 1, maxScore: 10, status: "bad", detail: `最大回撤 ${risk.max_drawdown}%，风险较高` });
    }
  }

  // 6. Asset type diversity
  const types = new Set(holdings.map((h) => h.asset_type));
  if (types.size >= 3) {
    checks.push({ label: "品类", score: 10, maxScore: 10, status: "good", detail: `${types.size}种资产类型，配置均衡` });
  } else if (types.size >= 2) {
    checks.push({ label: "品类", score: 6, maxScore: 10, status: "warn", detail: `${types.size}种资产类型，可增加` });
  } else {
    checks.push({ label: "品类", score: 3, maxScore: 10, status: "warn", detail: `仅${types.size}种资产类型` });
  }

  return checks;
}

function getGrade(totalScore: number, maxScore: number): { grade: string; label: string; color: string } {
  const pct = (totalScore / maxScore) * 100;
  if (pct >= 80) return { grade: "A", label: "优秀", color: "text-green-600" };
  if (pct >= 60) return { grade: "B", label: "良好", color: "text-blue-600" };
  if (pct >= 40) return { grade: "C", label: "一般", color: "text-amber-600" };
  return { grade: "D", label: "需改善", color: "text-red-600" };
}

const StatusIcon = ({ status }: { status: "good" | "warn" | "bad" }) => {
  if (status === "good") return <CheckCircle size={12} className="text-green-500" />;
  if (status === "warn") return <AlertTriangle size={12} className="text-amber-500" />;
  return <XCircle size={12} className="text-red-500" />;
};

export function PortfolioHealthCard() {
  const { data: portfolio } = useApi<Portfolio>(
    () => api.get("/wealth/portfolio")
  );
  const { data: risk } = useApi<RiskMetrics>(
    () => api.get("/wealth/portfolio/risk-metrics")
  );

  if (!portfolio || portfolio.holdings.length === 0) return null;

  const checks = analyzeHealth(portfolio, risk);
  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);
  const grade = getGrade(totalScore, maxScore);

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <Heart size={12} className="text-red-400" />
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">组合健康度</p>
      </div>

      {/* Grade display */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className={`text-4xl font-extrabold ${grade.color}`}>{grade.grade}</p>
          <p className={`text-[10px] font-semibold ${grade.color}`}>{grade.label}</p>
        </div>
        <div className="flex-1">
          {/* Score bar */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">综合评分</span>
            <span className="text-xs font-bold">{totalScore}/{maxScore}</span>
          </div>
          <div className="h-2 bg-[var(--color-muted)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalScore / maxScore >= 0.6 ? "bg-green-400" : totalScore / maxScore >= 0.4 ? "bg-amber-400" : "bg-red-400"
              }`}
              style={{ width: `${(totalScore / maxScore) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Individual checks */}
      <div className="space-y-1.5">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 py-1">
            <StatusIcon status={check.status} />
            <span className="text-[10px] font-semibold w-8">{check.label}</span>
            <div className="flex-1 h-1 bg-[var(--color-muted)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  check.status === "good" ? "bg-green-400" : check.status === "warn" ? "bg-amber-400" : "bg-red-400"
                }`}
                style={{ width: `${(check.score / check.maxScore) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-[var(--color-muted-foreground)] w-32 text-right truncate">
              {check.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
