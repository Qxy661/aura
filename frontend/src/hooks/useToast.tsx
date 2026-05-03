import { useState, useCallback } from "react";
import { ErrorToast } from "@/components/ui/ErrorToast";
import type { ReactNode } from "react";

export function useToast() {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const nextIdRef = { current: 0 };

  const showError = useCallback((message: string) => {
    const id = ++nextIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  function ToastContainer(): ReactNode {
    return (
      <>
        {toasts.map((t) => (
          <ErrorToast key={t.id} message={t.message} onClose={() => removeToast(t.id)} />
        ))}
      </>
    );
  }

  return { showError, ToastContainer };
}
