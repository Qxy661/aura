interface HeatMapItem {
  label: string;
  value: number; // profit_pct
}

interface HeatMapProps {
  data: HeatMapItem[];
}

function getColor(pct: number): string {
  if (pct > 5) return "#C53030";
  if (pct > 2) return "#E85D4A";
  if (pct > 0) return "#FEB2B2";
  if (pct === 0) return "#EDF2F7";
  if (pct > -2) return "#C6F6D5";
  if (pct > -5) return "#68D391";
  return "#38A169";
}

function getTextColor(pct: number): string {
  if (Math.abs(pct) > 2) return "white";
  return "var(--color-foreground)";
}

export function HeatMap({ data }: HeatMapProps) {
  if (!data.length) return null;

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {data.map((item, i) => (
        <div
          key={i}
          className="rounded-lg p-2 text-center transition-transform hover:scale-105"
          style={{
            backgroundColor: getColor(item.value),
            color: getTextColor(item.value),
          }}
        >
          <p className="text-[10px] font-bold truncate">{item.label}</p>
          <p className="text-xs font-extrabold mt-0.5">
            {item.value >= 0 ? "+" : ""}{item.value.toFixed(1)}%
          </p>
        </div>
      ))}
    </div>
  );
}
