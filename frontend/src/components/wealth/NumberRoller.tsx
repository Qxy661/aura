import { useEffect, useState, useRef } from "react";

interface NumberRollerProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  colorize?: boolean; // red positive, green negative
}

export function NumberRoller({
  value,
  prefix = "",
  suffix = "",
  decimals = 2,
  className = "",
  colorize = false,
}: NumberRollerProps) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const duration = 500;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  const formatted = display.toFixed(decimals);
  const colorClass = colorize
    ? value > 0
      ? "text-[#E85D4A]"
      : value < 0
        ? "text-[#6BBF59]"
        : ""
    : "";

  return (
    <span className={`font-extrabold tabular-nums ${colorClass} ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
