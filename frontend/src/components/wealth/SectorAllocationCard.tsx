import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { PieChart } from "@/components/charts/PieChart";
import { Layers, AlertTriangle } from "lucide-react";

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

const TYPE_LABELS: Record<string, string> = {
  fund: "基金",
  stock: "A股",
  a_share: "A股",
  us_stock: "美股",
  crypto: "加密",
  hk_stock: "港股",
};

const TYPE_COLORS: Record<string, string> = {
  fund: "#F5C842",
  stock: "#E85D4A",
  a_share: "#E85D4A",
  us_stock: "#7BAFD4",
  crypto: "#F5A623",
  hk_stock: "#6BBF59",
};

export function SectorAllocationCard() {
  const { data: allocation } = useApi<Allocation>(
    () => api.get("/wealth/allocation")
  );

  if (!allocation || allocation.items.length === 0) return null;

  // Group by asset type
  const byType: Record<string, { value: number; items: AllocationItem[] }> = {};
  for (const item of allocation.items) {
    const type = item.asset_type || "fund";
    if (!byType[type]) byType[type] = { value: 0, items: [] };
    byType[type].value += item.market_value;
    byType[type].items.push(item);
  }

  const typeEntries = Object.entries(byType)
    .map(([type, data]) => ({
      type,
      label: TYPE_LABELS[type] || type,
      value: data.value,
      pct: (data.value / allocation.total) * 100,
      count: data.items.length,
      items: data.items,
      color: TYPE_COLORS[type] || "#999",
    }))
    .sort((a, b) => b.value - a.value);

  // Find concentration warnings
  const warnings = typeEntries.filter((t) => t.pct > 50);

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <Layers size={12} className="text-[var(--color-primary)]" />
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">资产配置分析</p>
      </div>

      {/* Pie chart by type */}
      <div className="flex justify-center">
        <PieChart
          data={typeEntries.map((t) => ({
            name: t.label,
            value: t.value,
            color: t.color,
          }))}
          centerLabel={`¥${(allocation.total / 10000).toFixed(1)}万`}
        />
      </div>

      {/* Type breakdown */}
      <div className="space-y-2">
        {typeEntries.map((t) => (
          <div key={t.type} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold">{t.label}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {t.count}个 · {t.pct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${t.pct}%`, backgroundColor: t.color }}
                />
              </div>
            </div>
            <span className="text-[10px] font-bold shrink-0">
              ¥{t.value >= 10000 ? `${(t.value / 10000).toFixed(1)}万` : t.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Concentration warnings */}
      {warnings.length > 0 && (
        <div className="pt-2 border-t border-[var(--color-border)]">
          {warnings.map((w) => (
            <div key={w.type} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50">
              <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-amber-800">
                {w.label}占比 {w.pct.toFixed(1)}%，集中度较高，建议适当分散配置
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
