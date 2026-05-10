import { Plus, Camera, BarChart3, Brain, Calculator, Bell, Search } from "lucide-react";

interface QuickActionBarProps {
  onAdd: () => void;
  onOcr: () => void;
  onRebalance: () => void;
  onBehavior: () => void;
  onDca: () => void;
  onAlerts: () => void;
  onResearch: () => void;
}

interface ActionBtnProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

function ActionBtn({ icon, label, color, onClick }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
    >
      <div
        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform active:scale-95 ${color}`}
      >
        {icon}
      </div>
      <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
        {label}
      </span>
    </button>
  );
}

export function QuickActionBar({ onAdd, onOcr, onRebalance, onBehavior, onDca, onAlerts, onResearch }: QuickActionBarProps) {
  return (
    <div className="flex gap-4 overflow-x-auto scroll-hide px-1 py-1">
      <ActionBtn
        icon={<Plus size={18} className="text-white" />}
        label="添加持仓"
        color="bg-[var(--color-primary)] shadow-md"
        onClick={onAdd}
      />
      <ActionBtn
        icon={<Camera size={18} className="text-white" />}
        label="OCR导入"
        color="bg-blue-400 shadow-md"
        onClick={onOcr}
      />
      <ActionBtn
        icon={<BarChart3 size={18} className="text-white" />}
        label="AI再平衡"
        color="bg-purple-400 shadow-md"
        onClick={onRebalance}
      />
      <ActionBtn
        icon={<Brain size={18} className="text-white" />}
        label="行为分析"
        color="bg-teal-400 shadow-md"
        onClick={onBehavior}
      />
      <ActionBtn
        icon={<Calculator size={18} className="text-white" />}
        label="定投计算"
        color="bg-amber-400 shadow-md"
        onClick={onDca}
      />
      <ActionBtn
        icon={<Bell size={18} className="text-white" />}
        label="价格提醒"
        color="bg-rose-400 shadow-md"
        onClick={onAlerts}
      />
      <ActionBtn
        icon={<Search size={18} className="text-white" />}
        label="基金研究"
        color="bg-indigo-400 shadow-md"
        onClick={onResearch}
      />
    </div>
  );
}
