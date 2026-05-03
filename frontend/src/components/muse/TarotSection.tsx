import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface TarotCard {
  name: string;
  meaning: string;
  is_reversed: boolean;
}

interface TarotSectionProps {
  onError: (msg: string) => void;
}

export function TarotSection({ onError }: TarotSectionProps) {
  const [card, setCard] = useState<TarotCard | null>(null);
  const [drawing, setDrawing] = useState(false);

  const draw = async () => {
    setDrawing(true);
    try {
      const result = await api.get<TarotCard>("/muse/tarot");
      setCard(result);
    } catch (e) {
      onError(e instanceof Error ? e.message : "抽取塔罗牌失败");
    } finally {
      setDrawing(false);
    }
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">
          <Sparkles size={12} className="inline mr-1" /> 今日塔罗指引
        </p>
        <button
          onClick={draw}
          disabled={drawing}
          className="btn-soft text-[11px] px-3 py-1.5"
        >
          {drawing ? "🃏 抽取中..." : "🃏 抽一张"}
        </button>
      </div>
      {card ? (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF5E6] to-[#FFE4B5] border border-[var(--color-primary)] fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🃏</span>
            <div>
              <p className="text-sm font-extrabold">{card.name}</p>
              {card.is_reversed && <span className="tag text-[10px] mt-0.5">↕️ 逆位</span>}
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
            {card.meaning}
          </p>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">🐶 小狗帮你抽一张今日指引</p>
        </div>
      )}
    </div>
  );
}
