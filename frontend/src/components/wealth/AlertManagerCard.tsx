import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { Bell, BellRing, Plus, Trash2, TrendingUp, TrendingDown, X } from "lucide-react";

interface AlertItem {
  id: number;
  holding_id: number;
  holding_name: string;
  holding_code: string;
  alert_type: "above" | "below";
  target_price: number;
  is_active: number;
  triggered_at: string | null;
  created_at: string;
}

interface Holding {
  id: number;
  name: string;
  code: string;
}

interface Props {
  holdings: Holding[];
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function AlertManagerCard({ holdings, onSuccess, onError }: Props) {
  const { data: alerts, refetch, loading } = useApi<AlertItem[]>(
    () => api.get("/wealth/alerts?active_only=false")
  );

  const [showAdd, setShowAdd] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<number | null>(null);
  const [alertType, setAlertType] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [checking, setChecking] = useState(false);

  const activeAlerts = alerts?.filter((a) => a.is_active === 1) || [];
  const triggeredAlerts = alerts?.filter((a) => a.is_active === 0) || [];

  const addAlert = async () => {
    if (!selectedHolding || !targetPrice) return;
    try {
      await api.post("/wealth/alerts", {
        holding_id: selectedHolding,
        alert_type: alertType,
        target_price: parseFloat(targetPrice),
      });
      const h = holdings.find((h) => h.id === selectedHolding);
      onSuccess?.(`已设置 ${h?.name} 价格提醒`);
      setShowAdd(false);
      setSelectedHolding(null);
      setTargetPrice("");
      refetch();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "设置失败");
    }
  };

  const deleteAlert = async (id: number) => {
    try {
      await api.del(`/wealth/alerts/${id}`);
      onSuccess?.("已删除提醒");
      refetch();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "删除失败");
    }
  };

  const checkAlerts = async () => {
    setChecking(true);
    try {
      const res = await api.post("/wealth/alerts/check") as { checked: number; triggered: { holding_name: string }[] };
      if (res.triggered && res.triggered.length > 0) {
        const names = res.triggered.map((t) => t.holding_name).join("、");
        onSuccess?.(`触发了 ${res.triggered.length} 个提醒: ${names}`);
        refetch();
      } else {
        onSuccess?.(`已检查 ${res.checked} 个提醒，暂无触发`);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "检查失败");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Bell size={12} className="text-[var(--color-primary)]" />
          <p className="text-xs font-bold text-[var(--color-muted-foreground)]">价格提醒</p>
          {activeAlerts.length > 0 && (
            <span className="text-[9px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] px-1.5 py-0.5 rounded-full font-semibold">
              {activeAlerts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={checkAlerts}
            disabled={checking || activeAlerts.length === 0}
            className="text-[10px] font-semibold text-[var(--color-primary)] disabled:opacity-40"
          >
            {checking ? "检查中..." : "检查提醒"}
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-[10px] font-semibold text-[var(--color-primary)] flex items-center gap-0.5"
          >
            {showAdd ? <X size={10} /> : <Plus size={10} />}
            {showAdd ? "取消" : "添加"}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="space-y-2 p-3 rounded-lg bg-[var(--color-muted)]/50 fade-in-up">
          <select
            value={selectedHolding ?? ""}
            onChange={(e) => setSelectedHolding(Number(e.target.value) || null)}
            className="cute-input text-[10px] w-full py-1"
          >
            <option value="">选择持仓...</option>
            {holdings.map((h) => (
              <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
            ))}
          </select>
          <div className="flex gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => setAlertType("above")}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  alertType === "above"
                    ? "bg-red-100 text-red-600 border border-red-300"
                    : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                }`}
              >
                <TrendingUp size={10} className="inline mr-0.5" /> 高于
              </button>
              <button
                onClick={() => setAlertType("below")}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  alertType === "below"
                    ? "bg-green-100 text-green-600 border border-green-300"
                    : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                }`}
              >
                <TrendingDown size={10} className="inline mr-0.5" /> 低于
              </button>
            </div>
            <input
              type="number"
              step="any"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="目标价格"
              className="cute-input text-[10px] flex-1 py-1"
            />
          </div>
          <button
            onClick={addAlert}
            disabled={!selectedHolding || !targetPrice}
            className="btn-primary text-[10px] w-full py-1.5 disabled:opacity-40"
          >
            设置提醒
          </button>
        </div>
      )}

      {/* Alert list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-[var(--color-muted)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">还没有价格提醒</p>
          <p className="text-[9px] text-[var(--color-muted-foreground)] mt-1">添加提醒，当价格达到目标时会通知你</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Active alerts */}
          {activeAlerts.map((alert) => (
            <div key={alert.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-muted)]/50 group">
              <div className={`p-1 rounded ${alert.alert_type === "above" ? "bg-red-100" : "bg-green-100"}`}>
                {alert.alert_type === "above" ? (
                  <TrendingUp size={10} className="text-red-500" />
                ) : (
                  <TrendingDown size={10} className="text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate">{alert.holding_name}</p>
                <p className="text-[9px] text-[var(--color-muted-foreground)]">
                  {alert.alert_type === "above" ? "高于" : "低于"} ¥{alert.target_price}
                </p>
              </div>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">监控中</span>
              <button
                onClick={() => deleteAlert(alert.id)}
                className="p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={10} className="text-red-400" />
              </button>
            </div>
          ))}

          {/* Triggered alerts */}
          {triggeredAlerts.length > 0 && (
            <>
              <p className="text-[9px] text-[var(--color-muted-foreground)] font-semibold pt-1">已触发</p>
              {triggeredAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 group">
                  <BellRing size={10} className="text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">{alert.holding_name}</p>
                    <p className="text-[9px] text-amber-600">
                      {alert.alert_type === "above" ? "已突破" : "已跌破"} ¥{alert.target_price}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} className="text-red-400" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
