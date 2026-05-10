import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuotePanel } from "@/components/muse/QuotePanel";
import { NotePanel } from "@/components/muse/NotePanel";
import { MoodPanel } from "@/components/muse/MoodPanel";
import { TarotSection } from "@/components/muse/TarotSection";

export default function MusePage() {
  const { showSuccess, showError, showInfo, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState<"quotes" | "notes" | "mood" | "tarot">("quotes");

  const tabs = [
    { key: "quotes" as const, label: "书摘", emoji: "📖" },
    { key: "notes" as const, label: "闪念", emoji: "🐾" },
    { key: "mood" as const, label: "心情", emoji: "🌈" },
    { key: "tarot" as const, label: "塔罗", emoji: "🔮" },
  ];

  return (
    <div className="space-y-4 fade-in-up">
      <PageHeader title="灵感角落" subtitle="书摘 · 闪念 · 心情 · 塔罗" mascotMood="excited" />

      {/* Tab switcher */}
      <div className="flex gap-2 bg-[var(--color-muted)] rounded-2xl p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.key
                ? "bg-white text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "quotes" && <QuotePanel onSuccess={showSuccess} onError={showError} onInfo={showInfo} />}
      {activeTab === "notes" && <NotePanel onSuccess={showSuccess} onError={showError} />}
      {activeTab === "mood" && <MoodPanel />}
      {activeTab === "tarot" && <TarotSection onError={showError} />}

      <ToastContainer />
    </div>
  );
}
