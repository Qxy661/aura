import { useState, useRef, useCallback } from "react";

interface SwipeableCardsProps {
  items: unknown[];
  renderItem: (item: unknown, index: number) => React.ReactNode;
  onSwipeLeft?: (index: number) => void;
  onSwipeRight?: (index: number) => void;
}

export function SwipeableCards({ items, renderItem, onSwipeLeft, onSwipeRight }: SwipeableCardsProps) {
  const [current, setCurrent] = useState(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef(false);

  const threshold = 100;

  const handleStart = useCallback((clientX: number, clientY: number) => {
    startX.current = clientX;
    startY.current = clientY;
    locked.current = false;
    setSwiping(true);
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!swiping) return;
    const dx = clientX - startX.current;
    const dy = clientY - startY.current;

    // Lock to horizontal after initial movement
    if (!locked.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      locked.current = true;
    }

    if (locked.current && Math.abs(dx) > Math.abs(dy)) {
      setOffset(dx);
    }
  }, [swiping]);

  const handleEnd = useCallback(() => {
    if (!swiping) return;
    setSwiping(false);

    if (offset < -threshold && current < items.length - 1) {
      onSwipeLeft?.(current);
      setCurrent(current + 1);
    } else if (offset > threshold && current > 0) {
      onSwipeRight?.(current);
      setCurrent(current - 1);
    }

    setOffset(0);
  }, [swiping, offset, current, items.length, onSwipeLeft, onSwipeRight]);

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < items.length) setCurrent(idx);
  };

  if (!items.length) return null;

  return (
    <div className="relative">
      {/* Cards container */}
      <div
        className="relative overflow-hidden"
        style={{ minHeight: 280 }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => { if (swiping) handleMove(e.clientX, e.clientY); }}
        onMouseUp={handleEnd}
        onMouseLeave={() => { if (swiping) handleEnd(); }}
      >
        {items.map((item, i) => {
          const diff = i - current;
          if (diff < 0 || diff > 2) return null;

          const isCurrent = diff === 0;
          const translateX = isCurrent ? offset : diff * 16;
          const scale = 1 - diff * 0.05;
          const opacity = 1 - diff * 0.2;
          const zIndex = 10 - diff;

          return (
            <div
              key={i}
              className="absolute inset-0 transition-none"
              style={{
                transform: `translateX(${translateX}px) scale(${scale})`,
                opacity,
                zIndex,
                transition: swiping ? "none" : "transform 0.3s ease, opacity 0.3s ease",
              }}
            >
              {renderItem(item, i)}
            </div>
          );
        })}
      </div>

      {/* Counter + buttons */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="btn-soft text-xs px-3 py-1.5 disabled:opacity-30"
        >
          ← 上一张
        </button>
        <span className="text-xs text-[var(--color-muted-foreground)] font-bold tabular-nums">
          {current + 1} / {items.length}
        </span>
        <button
          onClick={() => goTo(current + 1)}
          disabled={current >= items.length - 1}
          className="btn-soft text-xs px-3 py-1.5 disabled:opacity-30"
        >
          下一张 →
        </button>
      </div>
    </div>
  );
}
