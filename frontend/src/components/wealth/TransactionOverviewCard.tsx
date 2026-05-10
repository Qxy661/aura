import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { ArrowUpCircle, ArrowDownCircle, Activity, Calendar } from "lucide-react";

interface Transaction {
  id: number;
  holding_id: number;
  holding_name: string;
  holding_code: string;
  asset_type: string;
  tx_type: "buy" | "sell";
  price: number;
  shares: number;
  amount: number;
  note: string;
  tx_date: string;
}

interface TxOverview {
  transactions: Transaction[];
  summary: {
    total_buy: number;
    total_sell: number;
    net_flow: number;
    tx_count: number;
  };
  monthly_flow: { month: string; flow: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  fund: "基金",
  stock: "A股",
  a_share: "A股",
  us_stock: "美股",
  crypto: "加密",
  hk_stock: "港股",
};

export function TransactionOverviewCard() {
  const { data, loading } = useApi<TxOverview>(
    () => api.get("/wealth/transactions/overview?limit=15")
  );

  if (loading) {
    return (
      <div className="cute-card p-4 space-y-3">
        <div className="h-4 w-24 bg-[var(--color-muted)] rounded animate-pulse" />
        <div className="h-20 bg-[var(--color-muted)] rounded animate-pulse" />
      </div>
    );
  }

  if (!data || data.transactions.length === 0) return null;

  const { summary, monthly_flow, transactions } = data;
  const maxFlow = Math.max(...monthly_flow.map((m) => Math.abs(m.flow)), 1);

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <Activity size={12} className="text-[var(--color-primary)]" />
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">交易总览</p>
        <span className="text-[9px] text-[var(--color-muted-foreground)] ml-auto">{summary.tx_count}笔</span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-red-50/60 text-center">
          <div className="flex items-center justify-center gap-0.5">
            <ArrowDownCircle size={10} className="text-red-400" />
            <span className="text-[8px] text-[var(--color-muted-foreground)]">买入</span>
          </div>
          <p className="text-xs font-bold text-red-500">¥{summary.total_buy >= 10000 ? `${(summary.total_buy / 10000).toFixed(1)}万` : summary.total_buy.toLocaleString()}</p>
        </div>
        <div className="p-2 rounded-lg bg-green-50/60 text-center">
          <div className="flex items-center justify-center gap-0.5">
            <ArrowUpCircle size={10} className="text-green-400" />
            <span className="text-[8px] text-[var(--color-muted-foreground)]">卖出</span>
          </div>
          <p className="text-xs font-bold text-green-500">¥{summary.total_sell >= 10000 ? `${(summary.total_sell / 10000).toFixed(1)}万` : summary.total_sell.toLocaleString()}</p>
        </div>
        <div className="p-2 rounded-lg bg-[var(--color-muted)]/60 text-center">
          <span className="text-[8px] text-[var(--color-muted-foreground)]">净流出</span>
          <p className={`text-xs font-bold ${summary.net_flow >= 0 ? "text-green-500" : "text-red-500"}`}>
            {summary.net_flow >= 0 ? "+" : ""}¥{Math.abs(summary.net_flow) >= 10000 ? `${(Math.abs(summary.net_flow) / 10000).toFixed(1)}万` : Math.abs(summary.net_flow).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Monthly flow chart */}
      {monthly_flow.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] text-[var(--color-muted-foreground)] font-semibold flex items-center gap-1">
            <Calendar size={9} /> 月度资金流向
          </p>
          <div className="flex items-end gap-0.5 h-14">
            {monthly_flow.map((m) => {
              const isPositive = m.flow >= 0;
              const height = (Math.abs(m.flow) / maxFlow) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={`w-full rounded-t-sm ${isPositive ? "bg-green-400" : "bg-red-400"}`}
                    style={{ height: `${Math.max(height, 3)}%` }}
                  />
                  <span className="text-[6px] text-[var(--color-muted-foreground)]">
                    {m.month.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="space-y-1">
        <p className="text-[9px] text-[var(--color-muted-foreground)] font-semibold">最近交易</p>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {transactions.slice(0, 8).map((tx) => (
            <div key={tx.id} className="flex items-center gap-2 py-1">
              <div className={`w-1 h-4 rounded-full ${tx.tx_type === "buy" ? "bg-red-400" : "bg-green-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold truncate">{tx.holding_name}</span>
                  <span className="text-[8px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] px-1 py-0.5 rounded font-medium">
                    {TYPE_LABELS[tx.asset_type] || tx.asset_type}
                  </span>
                </div>
                <span className="text-[8px] text-[var(--color-muted-foreground)]">{tx.tx_date}</span>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-bold ${tx.tx_type === "buy" ? "text-red-500" : "text-green-500"}`}>
                  {tx.tx_type === "buy" ? "买入" : "卖出"} ¥{tx.amount.toLocaleString()}
                </span>
                <p className="text-[8px] text-[var(--color-muted-foreground)]">
                  {tx.shares}份 × ¥{tx.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
