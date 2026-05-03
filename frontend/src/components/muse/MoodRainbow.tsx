import { PuppyMascot } from "@/components/ui/PuppyMascot";

interface MoodRecord {
  id: number;
  mood: string;
  date: string;
  note: string;
}

const MOODS = [
  { key: "happy", label: "开心", emoji: "😊", color: "#F5C842" },
  { key: "calm", label: "平静", emoji: "😌", color: "#6BBF59" },
  { key: "inspired", label: "灵感", emoji: "✨", color: "#F5A623" },
  { key: "sad", label: "emo", emoji: "😢", color: "#7BAFD4" },
  { key: "anxious", label: "焦虑", emoji: "😰", color: "#E85D4A" },
];

interface MoodRainbowProps {
  moodData: MoodRecord[];
}

export function MoodRainbow({ moodData }: MoodRainbowProps) {
  const moodCounts: Record<string, number> = {};
  moodData.forEach((m) => {
    moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
  });
  const total = Object.values(moodCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="cute-card p-4 space-y-3">
      <p className="text-xs font-bold text-[var(--color-muted-foreground)]">🌈 心情彩虹 (近30天)</p>
      {total > 0 ? (
        <div className="space-y-2.5">
          {MOODS.map((m) => {
            const count = moodCounts[m.key] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={m.key} className="flex items-center gap-2.5">
                <span className="text-base w-6 text-center">{m.emoji}</span>
                <div className="flex-1 h-5 rounded-full bg-[var(--color-muted)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(pct, count > 0 ? 12 : 0)}%`,
                      backgroundColor: m.color,
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold text-[var(--color-muted-foreground)] w-6 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <PuppyMascot size={40} mood="sleeping" className="mx-auto" />
          <p className="text-xs text-[var(--color-muted-foreground)] mt-2">还没有心情记录</p>
        </div>
      )}
    </div>
  );
}
