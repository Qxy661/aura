import { useState, useEffect } from "react";
import { onBackendReady, isBackendReady } from "@/lib/api";

export function WakeUpScreen() {
  const [ready, setReady] = useState(isBackendReady());
  const [dots, setDots] = useState("");

  useEffect(() => {
    return onBackendReady(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) return;
    const iv = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(iv);
  }, [ready]);

  if (ready) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--color-background)] flex flex-col items-center justify-center">
      <div className="text-6xl puppy-bounce mb-6">🐶</div>
      <h2 className="text-lg font-extrabold text-[var(--color-foreground)] mb-2">
        小狗正在醒来{dots}
      </h2>
      <p className="text-xs text-[var(--color-muted-foreground)]">
        首次加载需要 30-60 秒，请耐心等待
      </p>
      <div className="mt-6 w-48 h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full animate-pulse"
          style={{ width: "60%" }}
        />
      </div>
    </div>
  );
}
