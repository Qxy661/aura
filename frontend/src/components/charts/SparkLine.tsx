interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
}

export function SparkLine({
  data,
  width = 200,
  height = 60,
  color = "var(--color-primary)",
  fillColor,
}: SparkLineProps) {
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 4;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * chartW;
    const y = padding + chartH - ((v - min) / range) * chartH;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const fillPath = `${linePath} L ${padding + chartW},${padding + chartH} L ${padding},${padding + chartH} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fillColor && (
        <path d={fillPath} fill={fillColor} opacity={0.3} />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.length > 0 && (
        <circle
          cx={padding + chartW}
          cy={padding + chartH - ((data[data.length - 1] - min) / range) * chartH}
          r={3}
          fill={color}
        />
      )}
    </svg>
  );
}
