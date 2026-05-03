interface TrendPoint {
  price: number;
  date: string;
}

interface TrendLineProps {
  data: TrendPoint[];
  costPrice?: number;
  width?: number;
  height?: number;
}

export function TrendLine({ data, costPrice, width = 280, height = 80 }: TrendLineProps) {
  if (!data.length) return null;

  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices, costPrice ?? Infinity) * 0.998;
  const maxP = Math.max(...prices, costPrice ?? -Infinity) * 1.002;
  const range = maxP - minP || 1;

  const padX = 4;
  const padY = 6;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padY + (1 - (d.price - minP) / range) * chartH;
    return { x, y };
  });

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`;

  const isUp = prices[prices.length - 1] >= prices[0];
  const lineColor = isUp ? "#E85D4A" : "#6BBF59";
  const fillColor = isUp ? "rgba(232,93,74,0.08)" : "rgba(107,191,89,0.08)";

  const costY = costPrice != null
    ? padY + (1 - (costPrice - minP) / range) * chartH
    : null;

  return (
    <svg width={width} height={height} className="block">
      {/* Area fill */}
      <path d={areaD} fill={fillColor} />
      {/* Price line */}
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Cost reference line */}
      {costY != null && (
        <line
          x1={padX}
          y1={costY}
          x2={padX + chartW}
          y2={costY}
          stroke="var(--color-muted-foreground)"
          strokeWidth={0.8}
          strokeDasharray="4 3"
          opacity={0.5}
        />
      )}
      {/* Latest price dot */}
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.5} fill={lineColor} />
      )}
    </svg>
  );
}
