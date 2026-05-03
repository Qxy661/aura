import { NavLink } from "react-router-dom";
import { Radar, TrendingUp, Sparkles } from "lucide-react";

const navItems = [
  { to: "/", icon: Radar, label: "科研", emoji: "🔬" },
  { to: "/wealth", icon: TrendingUp, label: "财富", emoji: "💰" },
  { to: "/muse", icon: Sparkles, label: "灵感", emoji: "✨" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t-2 border-[var(--color-border)]">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all duration-300 ${
                isActive
                  ? "bg-[var(--color-accent)] scale-105"
                  : "hover:bg-[var(--color-muted)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="text-lg leading-none">{item.emoji}</span>
                <span
                  className={`text-[10px] font-bold tracking-wide ${
                    isActive
                      ? "text-[var(--color-accent-foreground)]"
                      : "text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      {/* Safe area for mobile */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
