import { SparkLine } from "@/components/charts/SparkLine";

interface MoodRecord {
  id: number;
  mood: string;
  date: string;
  note: string;
}

const MOOD_SCORES: Record<string, number> = {
  anxious: 1,
  sad: 2,
  neutral: 3,
  calm: 4,
  inspired: 5,
  happy: 5,
};

const MOOD_COLORS: Record<string, string> = {
  happy: "#F5C842",
  calm: "#6BBF59",
  inspired: "#F5A623",
  sad: "#7BAFD4",
  anxious: "#E85D4A",
  neutral: "#999",
};

interface MoodTrendProps {
  moodData: MoodRecord[];
}

export function MoodTrend({ moodData }: MoodTrendProps) {
  if (!moodData.length) return null;

  // Sort by date ascending
  const sorted = [...moodData].sort((a, b) => a.date.localeCompare(b.date));
  const scores = sorted.map((m) => MOOD_SCORES[m.mood] ?? 3);
  const dates = sorted.map((m) => m.date.slice(5)); // MM-DD

  // Calculate average mood
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const avgLabel = avg >= 4.5 ? "很开心" : avg >= 3.5 ? "还不错" : avg >= 2.5 ? "一般般" : avg >= 1.5 ? "有点低落" : "需要关注";
  const avgColor = avg >= 4 ? "#F5C842" : avg >= 3 ? "#6BBF59" : avg >= 2 ? "#7BAFD4" : "#E85D4A";

  return (
    <div className="cute-card p-4 space-y-3">
      <p className="text-xs font-bold text-[var(--color-muted-foreground)]">📈 心情趋势 (近30天)</p>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SparkLine
            data={scores}
            height={50}
            color={avgColor}
            fillColor={avgColor}
          />
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold" style={{ color: avgColor }}>{avg.toFixed(1)}</p>
          <p className="text-[10px] text-[var(--color-muted-foreground)]">{avgLabel}</p>
        </div>
      </div>

      {/* Date labels */}
      <div className="flex justify-between px-1">
        <span className="text-[8px] text-[var(--color-muted-foreground)]">{dates[0]}</span>
        {dates.length > 2 && (
          <span className="text-[8px] text-[var(--color-muted-foreground)]">{dates[Math.floor(dates.length / 2)]}</span>
        )}
        <span className="text-[8px] text-[var(--color-muted-foreground)]">{dates[dates.length - 1]}</span>
      </div>

      {/* Legend */}
      <div className="flex gap-2 flex-wrap justify-center">
        {Object.entries(MOOD_SCORES).filter(([k]) => k !== "neutral").map(([key, score]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MOOD_COLORS[key] }} />
            <span className="text-[8px] text-[var(--color-muted-foreground)]">
              {key === "happy" ? "开心" : key === "calm" ? "平静" : key === "inspired" ? "灵感" : key === "sad" ? "emo" : "焦虑"}={score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
