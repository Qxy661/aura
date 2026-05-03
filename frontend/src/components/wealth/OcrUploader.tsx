import { useState, useRef } from "react";
import { Camera, X } from "lucide-react";
import { api } from "@/lib/api";
import { PuppyMascot } from "@/components/ui/PuppyMascot";

interface OCRHolding {
  name: string;
  code: string;
  cost_price: number;
  shares: number;
  asset_type: string;
}

interface OcrUploaderProps {
  onImported: () => void;
  onError: (msg: string) => void;
}

export function OcrUploader({ onImported, onError }: OcrUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OCRHolding[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOCR = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/wealth/holdings/ocr", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "识别失败" }));
        throw new Error(err.detail || "识别失败");
      }
      const data = await res.json();
      setResults(data.holdings || []);
    } catch (e) {
      onError(e instanceof Error ? e.message : "截图识别失败");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleOCR(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateResult = (index: number, field: keyof OCRHolding, value: string | number) => {
    const updated = [...results];
    updated[index] = { ...updated[index], [field]: value };
    setResults(updated);
  };

  const confirmImport = async () => {
    try {
      for (const h of results) {
        await api.post("/wealth/holdings", h);
      }
      setResults([]);
      onImported();
    } catch (e) {
      onError(e instanceof Error ? e.message : "导入失败");
    }
  };

  return (
    <>
      {loading && (
        <div className="cute-card p-6 text-center fade-in-up">
          <PuppyMascot size={48} mood="thinking" className="mx-auto puppy-bounce" />
          <p className="text-sm text-[var(--color-muted-foreground)] mt-3 font-medium">
            小狗正在识别截图...
          </p>
        </div>
      )}

      {results.length > 0 && !loading && (
        <div className="cute-card p-4 space-y-3 fade-in-up">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">📷 识别结果</p>
            <button onClick={() => setResults([])} className="p-1">
              <X size={16} className="text-[var(--color-muted-foreground)]" />
            </button>
          </div>
          {results.map((h, i) => (
            <div key={i} className="p-3 rounded-xl bg-[var(--color-muted)] space-y-2">
              <input
                value={h.name}
                onChange={(e) => updateResult(i, "name", e.target.value)}
                className="cute-input text-xs"
                placeholder="基金名称"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={h.code}
                  onChange={(e) => updateResult(i, "code", e.target.value)}
                  className="cute-input text-xs"
                  placeholder="代码"
                />
                <input
                  type="number"
                  value={h.cost_price}
                  onChange={(e) => updateResult(i, "cost_price", parseFloat(e.target.value) || 0)}
                  className="cute-input text-xs"
                  placeholder="成本价"
                />
                <input
                  type="number"
                  value={h.shares}
                  onChange={(e) => updateResult(i, "shares", parseFloat(e.target.value) || 0)}
                  className="cute-input text-xs"
                  placeholder="份额"
                />
              </div>
            </div>
          ))}
          <button onClick={confirmImport} className="btn-primary w-full text-xs">
            ✅ 确认导入 ({results.length} 条)
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex-1 cute-card p-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
      >
        <Camera size={14} /> 扫描截图
      </button>
    </>
  );
}
