import { X } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "确认",
  cancelLabel = "取消",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl fade-in-up">
        <button onClick={onCancel} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--color-muted)] transition-colors">
          <X size={16} className="text-[var(--color-muted-foreground)]" />
        </button>
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">{destructive ? "⚠️" : "🐶"}</div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{message}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 btn-soft text-xs py-2.5">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 text-xs py-2.5 rounded-2xl font-bold transition-all ${
              destructive
                ? "bg-[var(--color-destructive)] text-white hover:opacity-90"
                : "btn-primary"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
