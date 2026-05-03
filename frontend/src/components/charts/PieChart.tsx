interface PieItem {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieItem[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}

const COLORS = [
  "#F5A623", "#E85D4A", "#6BBF59", "#8B6914",
  "#D4880F", "#C4A97D", "#FFDAB9", "#A0845C",
];

export function PieChart({ data, size = 160, thickness = 28, centerLabel }: PieChartProps) {
  if (!data.length) return null;

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;

  const r = size / 2;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {data.map((item, i) => {
            const pct = item.value / total;
            const offset = circumference * (1 - pct);
            const dashOffset = -cumulative * circumference;
            cumulative += pct;

            return (
              <circle
                key={i}
                cx={r}
                cy={r}
                r={r}
                fill="none"
                stroke={item.color || COLORS[i % COLORS.length]}
                strokeWidth={thickness}
                strokeDasharray={`${circumference - offset} ${offset}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        {centerLabel && (
          <div
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="text-xs font-bold text-[var(--color-foreground)] text-center leading-tight">{centerLabel}</span>
          </div>
        )}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color || COLORS[i % COLORS.length] }}
            />
            <span className="text-[10px] text-[var(--color-muted-foreground)]">
              {item.name} {((item.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
