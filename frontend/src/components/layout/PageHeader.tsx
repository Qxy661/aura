import { PuppyMascot } from "@/components/ui/PuppyMascot";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  mascotMood?: "happy" | "thinking" | "sleeping" | "excited";
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, mascotMood = "happy", action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 fade-in-up">
      <div className="flex items-center gap-3">
        <div className="relative">
          <PuppyMascot size={44} mood={mascotMood} className="puppy-bounce" />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--color-success)] rounded-full border-2 border-[var(--color-background)]" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-[var(--color-foreground)] tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)] font-medium mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
