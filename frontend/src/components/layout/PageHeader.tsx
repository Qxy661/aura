import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PuppyMascot } from "@/components/ui/PuppyMascot";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  mascotMood?: "happy" | "thinking" | "sleeping" | "excited";
  action?: React.ReactNode;
  back?: boolean;
}

export function PageHeader({ title, subtitle, mascotMood = "happy", action, back }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6 fade-in-up">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
          >
            <ArrowLeft size={18} className="text-[var(--color-foreground)]" />
          </button>
        )}
        {!back && (
          <PuppyMascot size={44} mood={mascotMood} className="puppy-bounce" />
        )}
        <div>
          <h1 className="text-xl font-extrabold text-[var(--color-foreground)] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[var(--color-muted-foreground)] font-medium mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
