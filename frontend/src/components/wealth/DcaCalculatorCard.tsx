import { useState, useMemo } from "react";
import { Calculator, TrendingUp, Calendar, PiggyBank } from "lucide-react";

interface DcaResult {
  month: number;
  totalInvested: number;
  totalValue: number;
  units: number;
  avgCost: number;
}

function calcDca(
  initialAmount: number,
  monthlyAmount: number,
  annualReturn: number,
  months: number,
  navStart: number
): DcaResult[] {
  const results: DcaResult[] = [];
  const monthlyReturn = annualReturn / 100 / 12;
  let totalInvested = initialAmount;
  let units = initialAmount / navStart;
  let nav = navStart;

  results.push({
    month: 0,
    totalInvested,
    totalValue: totalInvested,
    units,
    avgCost: navStart,
  });

  for (let m = 1; m <= months; m++) {
    nav *= 1 + monthlyReturn;
    const newUnits = monthlyAmount / nav;
    units += newUnits;
    totalInvested += monthlyAmount;
    const totalValue = units * nav;
    results.push({
      month: m,
      totalInvested,
      totalValue,
      units,
      avgCost: totalInvested / units,
    });
  }
  return results;
}

interface Props {
  holdingName?: string;
  holdingCode?: string;
  currentNav?: number;
}

export function DcaCalculatorCard({ holdingName, holdingCode, currentNav }: Props) {
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(2000);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [years, setYears] = useState(5);
  const [navStart, setNavStart] = useState(currentNav || 1);

  const months = years * 12;
  const results = useMemo(
    () => calcDca(initial, monthly, annualReturn, months, navStart),
    [initial, monthly, annualReturn, months, navStart]
  );

  const last = results[results.length - 1];
  const profit = last.totalValue - last.totalInvested;
  const profitPct = last.totalInvested > 0 ? (profit / last.totalInvested) * 100 : 0;
  const isProfit = profit >= 0;

  // Build simple bar chart data (sampled every 6 months)
  const sampled = results.filter((_, i) => i % 6 === 0 || i === results.length - 1);
  const maxVal = Math.max(...sampled.map((r) => r.totalValue));

  return (
    <div className="cute-card p-4 space-y-4">
      <div className="flex items-center gap-1.5">
        <Calculator size={12} className="text-[var(--color-primary)]" />
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">
          定投计算器{holdingName ? ` · ${holdingName}` : ""}
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-muted-foreground)]">初始投入 (元)</span>
          <input
            type="number"
            value={initial}
            onChange={(e) => setInitial(Number(e.target.value) || 0)}
            className="cute-input text-[10px] w-full py-1"
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-muted-foreground)]">每月定投 (元)</span>
          <input
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(Number(e.target.value) || 0)}
            className="cute-input text-[10px] w-full py-1"
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-muted-foreground)]">预期年化 (%)</span>
          <input
            type="number"
            value={annualReturn}
            onChange={(e) => setAnnualReturn(Number(e.target.value) || 0)}
            step="0.5"
            className="cute-input text-[10px] w-full py-1"
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[9px] text-[var(--color-muted-foreground)]">投资年限</span>
          <select
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="cute-input text-[10px] w-full py-1"
          >
            {[1, 2, 3, 5, 10, 15, 20].map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </label>
      </div>

      {/* Results summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-[var(--color-muted)]/60 text-center">
          <p className="text-[8px] text-[var(--color-muted-foreground)]">总投入</p>
          <p className="text-sm font-bold">¥{(last.totalInvested / 10000).toFixed(2)}万</p>
        </div>
        <div className="p-2 rounded-lg bg-[var(--color-muted)]/60 text-center">
          <p className="text-[8px] text-[var(--color-muted-foreground)]">预计市值</p>
          <p className={`text-sm font-bold ${isProfit ? "text-red-500" : "text-green-500"}`}>
            ¥{(last.totalValue / 10000).toFixed(2)}万
          </p>
        </div>
        <div className="p-2 rounded-lg bg-[var(--color-muted)]/60 text-center">
          <p className="text-[8px] text-[var(--color-muted-foreground)]">预计收益</p>
          <p className={`text-sm font-bold ${isProfit ? "text-red-500" : "text-green-500"}`}>
            {isProfit ? "+" : ""}¥{(profit / 10000).toFixed(2)}万
          </p>
        </div>
        <div className="p-2 rounded-lg bg-[var(--color-muted)]/60 text-center">
          <p className="text-[8px] text-[var(--color-muted-foreground)]">收益率</p>
          <p className={`text-sm font-bold ${isProfit ? "text-red-500" : "text-green-500"}`}>
            {isProfit ? "+" : ""}{profitPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="space-y-1">
        <p className="text-[9px] text-[var(--color-muted-foreground)] font-semibold flex items-center gap-1">
          <TrendingUp size={9} /> 资产增长趋势
        </p>
        <div className="flex items-end gap-0.5 h-20">
          {sampled.map((r, i) => (
            <div key={r.month} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={`w-full rounded-t-sm transition-all ${
                  r.totalValue >= r.totalInvested ? "bg-red-400" : "bg-green-400"
                }`}
                style={{ height: `${maxVal > 0 ? (r.totalValue / maxVal) * 100 : 0}%`, minHeight: "2px" }}
              />
              {i % 3 === 0 && (
                <span className="text-[7px] text-[var(--color-muted-foreground)]">
                  {r.month > 0 ? `${(r.month / 12).toFixed(0)}y` : ""}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="flex items-center justify-between text-[9px] text-[var(--color-muted-foreground)] pt-1 border-t border-[var(--color-border)]">
        <span className="flex items-center gap-1">
          <PiggyBank size={9} />
          平均成本 ¥{last.avgCost.toFixed(4)}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={9} />
          {last.units.toFixed(2)} 份
        </span>
      </div>
    </div>
  );
}
