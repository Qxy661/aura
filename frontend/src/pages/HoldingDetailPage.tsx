import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { MiniBarChart } from "@/components/charts/MiniBarChart";
import {
  ArrowLeft, TrendingUp, TrendingDown, Plus, Minus, Scale,
} from "lucide-react";

interface HoldingDetail {
  holding: {
    id: number;
    name: string;
    code: string;
    asset_type: string;
    cost_price: number;
    shares: number;
    current_price: number;
    market_value: number;
    cost_value: number;
    profit: number;
    profit_pct: number;
    change_pct: number;
  };
  price_history: { price: number; date: string }[];
  transactions: {
    id: number;
    tx_type: string;
    price: number;
    shares: number;
    amount: number;
    note: string;
    tx_date: string;
  }[];
}

interface Benchmark {
  holding_return: number;
  benchmark_return: number;
  alpha: number;
  holding_name: string;
  benchmark_name: string;
  days: number;
  message?: string;
}

export default function HoldingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError, ToastContainer } = useToast();
  const [detail, setDetail] = useState<HoldingDetail | null>(null);
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ tx_type: "buy", price: "", shares: "", note: "", tx_date: "" });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<HoldingDetail>(`/wealth/holdings/${id}/detail`),
      api.get<Benchmark>(`/wealth/holdings/${id}/benchmark`).catch(() => null),
    ])
      .then(([d, b]) => { setDetail(d); setBenchmark(b); })
      .catch(() => showError("加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddTx = async () => {
    if (!id || !txForm.price || !txForm.shares) return;
    try {
      await api.post(`/wealth/holdings/${id}/transactions`, {
        tx_type: txForm.tx_type,
        price: parseFloat(txForm.price),
        shares: parseFloat(txForm.shares),
        note: txForm.note,
        tx_date: txForm.tx_date || undefined,
      });
      showSuccess("交易记录已添加");
      setShowTxForm(false);
      setTxForm({ tx_type: "buy", price: "", shares: "", note: "", tx_date: "" });
      // Refresh
      const d = await api.get<HoldingDetail>(`/wealth/holdings/${id}/detail`);
      setDetail(d);
    } catch (e) {
      showError(e instanceof Error ? e.message : "添加失败");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 fade-in-up">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--color-muted-foreground)]">持仓不存在</p>
        <button onClick={() => navigate("/wealth")} className="btn-primary text-xs mt-4 px-4 py-2">返回</button>
      </div>
    );
  }

  const h = detail.holding;
  const isProfit = h.profit >= 0;

  return (
    <div className="space-y-4 fade-in-up">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/wealth")} className="p-1.5 rounded-lg hover:bg-[var(--color-muted)]">
          <ArrowLeft size={16} />
        </button>
        <PageHeader title={h.name} subtitle={h.code} />
      </div>

      {/* Price & P&L */}
      <div className="cute-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">¥{h.current_price.toFixed(4)}</p>
            <p className={`text-xs font-semibold ${h.change_pct >= 0 ? "text-red-500" : "text-green-500"}`}>
              {h.change_pct >= 0 ? "+" : ""}{h.change_pct.toFixed(2)}% 今日
            </p>
          </div>
          <div className={`p-3 rounded-xl ${isProfit ? "bg-red-50" : "bg-green-50"}`}>
            {isProfit ? <TrendingUp size={20} className="text-red-500" /> : <TrendingDown size={20} className="text-green-500" />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2 rounded-lg bg-[var(--color-muted)]">
            <p className="text-[var(--color-muted-foreground)]">市值</p>
            <p className="font-bold">¥{h.market_value.toLocaleString()}</p>
          </div>
          <div className="p-2 rounded-lg bg-[var(--color-muted)]">
            <p className="text-[var(--color-muted-foreground)]">成本</p>
            <p className="font-bold">¥{h.cost_value.toLocaleString()}</p>
          </div>
          <div className="p-2 rounded-lg bg-[var(--color-muted)]">
            <p className="text-[var(--color-muted-foreground)]">盈亏</p>
            <p className={`font-bold ${isProfit ? "text-red-500" : "text-green-500"}`}>
              {isProfit ? "+" : ""}¥{h.profit.toFixed(2)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-[var(--color-muted)]">
            <p className="text-[var(--color-muted-foreground)]">收益率</p>
            <p className={`font-bold ${isProfit ? "text-red-500" : "text-green-500"}`}>
              {isProfit ? "+" : ""}{h.profit_pct.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Price History Chart */}
      {detail.price_history.length > 1 && (
        <div className="cute-card p-4 space-y-2">
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">📈 价格走势</p>
          <MiniBarChart
            data={detail.price_history.map((p, i) => ({
              label: `${i + 1}`,
              value: p.price,
              color: p.price >= h.cost_price ? "#E85D4A" : "#6BBF59",
            }))}
            height={80}
          />
        </div>
      )}

      {/* Benchmark Comparison */}
      {benchmark && !benchmark.message && (
        <div className="cute-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Scale size={14} className="text-[var(--color-primary)]" />
            <p className="text-xs font-bold text-[var(--color-muted-foreground)]">基准对比（沪深300）</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="p-2 rounded-lg bg-[var(--color-muted)]">
              <p className="text-[var(--color-muted-foreground)]">持仓收益</p>
              <p className={`font-bold ${benchmark.holding_return >= 0 ? "text-red-500" : "text-green-500"}`}>
                {benchmark.holding_return >= 0 ? "+" : ""}{benchmark.holding_return}%
              </p>
            </div>
            <div className="p-2 rounded-lg bg-[var(--color-muted)]">
              <p className="text-[var(--color-muted-foreground)]">沪深300</p>
              <p className={`font-bold ${benchmark.benchmark_return >= 0 ? "text-red-500" : "text-green-500"}`}>
                {benchmark.benchmark_return >= 0 ? "+" : ""}{benchmark.benchmark_return}%
              </p>
            </div>
            <div className="p-2 rounded-lg bg-[var(--color-muted)]">
              <p className="text-[var(--color-muted-foreground)]">超额收益</p>
              <p className={`font-bold ${benchmark.alpha >= 0 ? "text-red-500" : "text-green-500"}`}>
                {benchmark.alpha >= 0 ? "+" : ""}{benchmark.alpha}%
              </p>
            </div>
          </div>
          <p className="text-[10px] text-[var(--color-muted-foreground)] text-center">
            基于 {benchmark.days} 天价格数据
          </p>
        </div>
      )}

      {/* Transactions */}
      <div className="cute-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">📋 交易记录</p>
          <button onClick={() => setShowTxForm(!showTxForm)} className="btn-soft text-[10px] px-2 py-1">
            <Plus size={10} className="inline mr-0.5" /> 记录交易
          </button>
        </div>

        {showTxForm && (
          <div className="p-3 rounded-xl bg-[var(--color-muted)] space-y-2 fade-in-up">
            <div className="flex gap-2">
              <button
                onClick={() => setTxForm({ ...txForm, tx_type: "buy" })}
                className={`flex-1 text-xs py-1.5 rounded-lg font-semibold ${txForm.tx_type === "buy" ? "bg-red-100 text-red-600" : "bg-[var(--color-background)]"}`}
              >
                <Plus size={10} className="inline mr-0.5" /> 买入
              </button>
              <button
                onClick={() => setTxForm({ ...txForm, tx_type: "sell" })}
                className={`flex-1 text-xs py-1.5 rounded-lg font-semibold ${txForm.tx_type === "sell" ? "bg-green-100 text-green-600" : "bg-[var(--color-background)]"}`}
              >
                <Minus size={10} className="inline mr-0.5" /> 卖出
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.0001"
                placeholder="价格"
                value={txForm.price}
                onChange={(e) => setTxForm({ ...txForm, price: e.target.value })}
                className="cute-input text-xs"
              />
              <input
                type="number"
                placeholder="份额"
                value={txForm.shares}
                onChange={(e) => setTxForm({ ...txForm, shares: e.target.value })}
                className="cute-input text-xs"
              />
            </div>
            <input
              type="date"
              value={txForm.tx_date}
              onChange={(e) => setTxForm({ ...txForm, tx_date: e.target.value })}
              className="cute-input text-xs"
            />
            <input
              placeholder="备注（可选）"
              value={txForm.note}
              onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
              className="cute-input text-xs"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowTxForm(false)} className="flex-1 btn-soft text-xs py-2">取消</button>
              <button onClick={handleAddTx} className="flex-1 btn-primary text-xs py-2">确认</button>
            </div>
          </div>
        )}

        {detail.transactions.length === 0 ? (
          <p className="text-xs text-[var(--color-muted-foreground)] text-center py-3">暂无交易记录</p>
        ) : (
          <div className="space-y-2">
            {detail.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-muted)]">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  tx.tx_type === "buy" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                }`}>
                  {tx.tx_type === "buy" ? "买入" : "卖出"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">¥{tx.price.toFixed(4)} × {tx.shares}份</p>
                  <p className="text-[10px] text-[var(--color-muted-foreground)]">
                    {tx.tx_date ? new Date(tx.tx_date).toLocaleDateString() : ""}
                    {tx.note ? ` · ${tx.note}` : ""}
                  </p>
                </div>
                <p className="text-xs font-bold">¥{tx.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}
