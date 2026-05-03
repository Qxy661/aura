interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface MiniBarChartProps {
  data: BarData[];
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
}

export function MiniBarChart({ data, height = 120, showLabels = true, showValues = true }: MiniBarChartProps) {
  if (!data.length) return null;

  const maxVal = Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => {
        const barHeight = Math.max((Math.abs(d.value) / maxVal) * 100, 4);
        const isNegative = d.value < 0;
        const color = d.color || (isNegative ? "var(--color-green, #6BBF59)" : "var(--color-red, #E85D4A)");

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            {showValues && (
              <span
                className="text-[9px] font-bold"
                style={{ color }}
              >
                {d.value >= 0 ? "+" : ""}{typeof d.value === "number" ? d.value.toFixed(1) : d.value}%
              </span>
            )}
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${barHeight}%`,
                backgroundColor: color,
                minHeight: 4,
              }}
            />
            {showLabels && (
              <span className="text-[8px] text-[var(--color-muted-foreground)] truncate w-full text-center">
                {d.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
