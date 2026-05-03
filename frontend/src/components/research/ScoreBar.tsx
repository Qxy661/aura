interface ScoreBarProps {
  score: number;
  label?: string;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score <= 3) return "var(--color-muted-foreground)";
  if (score <= 6) return "#D4880F";
  if (score <= 8) return "var(--color-primary)";
  return "var(--color-brown)";
}

export function ScoreBar({ score, label, className = "" }: ScoreBarProps) {
  const pct = Math.min(100, Math.max(0, score * 10));
  const color = getScoreColor(score);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="score-bar-track w-[60px]">
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>
        {score.toFixed(1)}
      </span>
      {label && (
        <span className="text-[10px] text-[var(--color-muted-foreground)]">{label}</span>
      )}
    </div>
  );
}
