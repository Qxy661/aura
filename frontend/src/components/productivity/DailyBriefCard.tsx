import { Skeleton } from "@/components/ui/Skeleton";

interface DailyBriefCardProps {
  content: string | null;
  date: string;
  articleCount: number;
  loading: boolean;
}

export function DailyBriefCard({ content, date, articleCount, loading }: DailyBriefCardProps) {
  if (loading) {
    return (
      <div className="cute-card p-4 space-y-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="cute-card p-4 text-center">
        <p className="text-xs text-[var(--color-muted-foreground)]">
          今日简报暂未生成，稍后再来看看
        </p>
      </div>
    );
  }

  return (
    <div className="cute-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">📋 今日科研简报</p>
        <div className="flex items-center gap-2">
          {articleCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
              {articleCount} 篇新论文
            </span>
          )}
          <span className="text-[10px] text-[var(--color-muted-foreground)]">{date}</span>
        </div>
      </div>
      <div className="text-xs leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}
