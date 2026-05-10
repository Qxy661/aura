import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { Radio } from "lucide-react";

interface IndexItem {
  name: string;
  code: string;
  price: number;
  change_pct: number;
}

interface MarketIndicesData {
  indices: IndexItem[];
}

export function MarketIndexBar() {
  const { data } = useApi<MarketIndicesData>(() => api.get("/wealth/market-indices"));

  const indices = data?.indices ?? [];

  if (!indices.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto scroll-hide py-1">
      {indices.map((idx) => {
        const isUp = idx.change_pct >= 0;
        return (
          <div
            key={idx.code}
            className="flex-shrink-0 cute-card px-3 py-2 flex items-center gap-2 min-w-[120px]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)] truncate">
                {idx.name}
              </p>
              <p className="text-xs font-extrabold tabular-nums">
                {idx.price > 0 ? idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "--"}
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isUp ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
              }`}
            >
              {isUp ? "+" : ""}{idx.change_pct.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
