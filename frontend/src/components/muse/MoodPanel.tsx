import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { MoodRainbow } from "@/components/muse/MoodRainbow";
import { MoodTrend } from "@/components/muse/MoodTrend";
import { Shuffle, Sparkles } from "lucide-react";

interface MoodRecord {
  id: number;
  mood: string;
  date: string;
  note: string;
}

export function MoodPanel() {
  const { data: moodData } = useApi<MoodRecord[]>(
    () => api.get("/muse/mood/heatmap?days=30")
  );
  const { data: moodAdvice, refetch: refetchAdvice } = useApi<{ mood: string; advice: string }>(
    () => api.get("/muse/mood/advice")
  );

  return (
    <div className="space-y-4">
      <MoodRainbow moodData={moodData ?? []} />
      <MoodTrend moodData={moodData ?? []} />

      {moodAdvice && (
        <div className="cute-card p-4 space-y-2 fade-in-up">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--color-muted-foreground)]">
              <Sparkles size={12} className="inline mr-1" /> 小狗的暖心话
            </p>
            <button
              onClick={refetchAdvice}
              className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
              title="刷新"
            >
              <Shuffle size={12} className="text-[var(--color-muted-foreground)]" />
            </button>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#FFF8E1] to-[#FFE4B5]">
            <p className="text-xs leading-relaxed">{moodAdvice.advice}</p>
          </div>
        </div>
      )}
    </div>
  );
}
