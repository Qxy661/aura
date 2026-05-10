import { X } from "lucide-react";

interface ActionOverlayProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function ActionOverlay({ title, onClose, children }: ActionOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg mx-auto max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[var(--color-background)] p-4 pb-8 fade-in-up">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-[var(--color-foreground)]">{title}</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
