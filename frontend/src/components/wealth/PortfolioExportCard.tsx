import { useState } from "react";
import { api } from "@/lib/api";
import { Share2, Copy, Check, RefreshCw } from "lucide-react";

interface Props {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function PortfolioExportCard({ onSuccess, onError }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.get("/wealth/portfolio/export") as { text: string };
      setText(res.text);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onSuccess?.("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError?.("复制失败，请手动选择复制");
    }
  };

  return (
    <div className="cute-card p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <Share2 size={12} className="text-[var(--color-primary)]" />
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">组合分享</p>
      </div>

      {!text ? (
        <div className="text-center py-4">
          <p className="text-[10px] text-[var(--color-muted-foreground)] mb-3">
            生成投资组合摘要，一键复制分享
          </p>
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary text-[11px] px-4 py-2 disabled:opacity-40"
          >
            {loading ? (
              <RefreshCw size={12} className="inline mr-1 animate-spin" />
            ) : (
              <Share2 size={12} className="inline mr-1" />
            )}
            {loading ? "生成中..." : "生成分享文本"}
          </button>
        </div>
      ) : (
        <div className="space-y-2 fade-in-up">
          {/* Preview */}
          <pre className="p-3 rounded-lg bg-[var(--color-muted)] text-[10px] font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {text}
          </pre>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={copyText} className="btn-primary text-[10px] flex-1 py-2 flex items-center justify-center gap-1">
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? "已复制" : "复制文本"}
            </button>
            <button onClick={generate} className="btn-soft text-[10px] px-3 py-2">
              <RefreshCw size={11} />
            </button>
            <button onClick={() => setText(null)} className="btn-soft text-[10px] px-3 py-2">
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
