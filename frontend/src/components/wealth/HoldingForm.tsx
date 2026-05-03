import { useState } from "react";
import { api } from "@/lib/api";

const ASSET_TYPES = [
  { value: "fund", label: "基金", icon: "📦" },
  { value: "a_share", label: "A股", icon: "📈" },
  { value: "us_stock", label: "美股", icon: "🇺🇸" },
  { value: "hk_stock", label: "港股", icon: "🇭🇰" },
  { value: "crypto", label: "加密", icon: "₿" },
];

interface HoldingFormProps {
  onSaved: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}

export function HoldingForm({ onSaved, onCancel, onError }: HoldingFormProps) {
  const [form, setForm] = useState({ name: "", code: "", asset_type: "fund", cost_price: "", shares: "" });

  const submit = async () => {
    if (!form.name || !form.code) return;
    try {
      await api.post("/wealth/holdings", {
        name: form.name,
        code: form.code,
        asset_type: form.asset_type,
        cost_price: parseFloat(form.cost_price) || 0,
        shares: parseFloat(form.shares) || 0,
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "添加失败");
    }
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">添加持仓</p>
        <button onClick={onCancel} className="text-lg leading-none">&times;</button>
      </div>

      {/* Asset type selector */}
      <div className="flex gap-1.5 flex-wrap">
        {ASSET_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setForm({ ...form, asset_type: t.value })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
              form.asset_type === t.value
                ? "border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                : "border-transparent bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <input
        placeholder="名称 (如: 沪深300ETF)"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="cute-input"
      />
      <input
        placeholder={form.asset_type === "fund" ? "基金代码 (如: 510300)" : form.asset_type === "us_stock" ? "美股代码 (如: AAPL)" : "股票代码 (如: 600519)"}
        value={form.code}
        onChange={(e) => setForm({ ...form, code: e.target.value })}
        className="cute-input"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="成本价"
          type="number"
          value={form.cost_price}
          onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
          className="cute-input"
        />
        <input
          placeholder="份额"
          type="number"
          value={form.shares}
          onChange={(e) => setForm({ ...form, shares: e.target.value })}
          className="cute-input"
        />
      </div>
      <button onClick={submit} className="btn-primary w-full text-xs">确认添加</button>
    </div>
  );
}
