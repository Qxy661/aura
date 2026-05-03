import { useEffect, useState } from "react";
import { X, AlertCircle } from "lucide-react";

interface ErrorToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function ErrorToast({ message, onClose, duration = 3000 }: ErrorToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <div className="bg-[var(--color-destructive)] text-white rounded-2xl px-4 py-3 shadow-lg flex items-start gap-3">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
          className="shrink-0 p-0.5 rounded-lg hover:bg-white/20 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
