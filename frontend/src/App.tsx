import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { BottomNav } from "@/components/layout/BottomNav";
import { WakeUpScreen } from "@/components/ui/WakeUpScreen";
import ResearchPage from "@/pages/ResearchPage";
import WealthPage from "@/pages/WealthPage";
import MusePage from "@/pages/MusePage";
import SettingsPage from "@/pages/SettingsPage";
import { PuppyMascot } from "@/components/ui/PuppyMascot";

function NotFound() {
  return (
    <div className="text-center py-16">
      <PuppyMascot size={80} mood="thinking" className="mx-auto" />
      <h2 className="text-lg font-bold mt-4">迷路了？</h2>
      <p className="text-sm text-[var(--color-muted-foreground)] mt-2">这个页面不存在哦</p>
      <a href="/" className="btn-primary text-xs mt-4 inline-block px-6 py-2.5">回到首页</a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <WakeUpScreen />
        <div className="min-h-screen bg-[var(--color-background)] pb-20">
          {/* Decorative background paws */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[10%] left-[5%] text-6xl opacity-[0.03] rotate-[-15deg]">🐾</div>
            <div className="absolute top-[30%] right-[8%] text-5xl opacity-[0.03] rotate-[20deg]">🐾</div>
            <div className="absolute bottom-[25%] left-[15%] text-7xl opacity-[0.03] rotate-[10deg]">🐾</div>
            <div className="absolute top-[60%] right-[20%] text-4xl opacity-[0.03] rotate-[-25deg]">🐾</div>
          </div>

          <main className="relative z-10 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 pt-6">
            <Routes>
              <Route path="/" element={<ResearchPage />} />
              <Route path="/wealth" element={<WealthPage />} />
              <Route path="/muse" element={<MusePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </main>

          <BottomNav />
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
