import { useState, useRef } from "react";
import { Camera, Clipboard, X } from "lucide-react";
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
  const [mode, setMode] = useState<"image" | "text">("text");
  const [text, setText] = useState("");
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

  const handleTextParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await api.post<{ holdings: OCRHolding[] }>(
        "/wealth/holdings/parse-text",
        { text: text.trim() }
      );
      setResults(res.holdings || []);
    } catch (e) {
      onError(e instanceof Error ? e.message : "文字解析失败");
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
      setText("");
      onImported();
    } catch (e) {
      onError(e instanceof Error ? e.message : "导入失败");
    }
  };

  return (
    <>
      {/* Mode toggle */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setMode("text")}
          className={`flex-1 cute-card p-3 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${
            mode === "text"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          }`}
        >
          <Clipboard size={14} /> 文字粘贴
        </button>
        <button
          onClick={() => setMode("image")}
          className={`flex-1 cute-card p-3 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${
            mode === "image"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          }`}
        >
          <Camera size={14} /> 扫描截图
        </button>
      </div>

      {/* Text input mode */}
      {mode === "text" && !loading && results.length === 0 && (
        <div className="cute-card p-4 space-y-3 fade-in-up">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">
            从基金 APP 复制持仓信息，粘贴到下方，AI 自动解析
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"例如：\n易方达蓝筹精选混合  005827\n持有金额 3,256.78 元\n\n中欧医疗健康混合  003095\n持有份额 1,200.00 份\n成本净值 0.8560"}
            className="cute-input text-xs w-full min-h-[120px] resize-y"
          />
          <button
            onClick={handleTextParse}
            disabled={!text.trim()}
            className="btn-primary w-full text-xs"
          >
            ✨ AI 解析持仓
          </button>
        </div>
      )}

      {/* Image upload mode */}
      {mode === "image" && !loading && results.length === 0 && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="cute-card p-6 flex flex-col items-center justify-center gap-2 text-xs font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <Camera size={24} />
            <span>点击上传基金持仓截图</span>
            <span className="text-[10px] opacity-60">支持 PNG / JPG / WebP</span>
          </button>
        </>
      )}

      {/* Loading state */}
      {loading && (
        <div className="cute-card p-6 text-center fade-in-up">
          <PuppyMascot size={48} mood="thinking" className="mx-auto puppy-bounce" />
          <p className="text-sm text-[var(--color-muted-foreground)] mt-3 font-medium">
            {mode === "text" ? "小狗正在解析文字..." : "小狗正在识别截图..."}
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !loading && (
        <div className="cute-card p-4 space-y-3 fade-in-up">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">📋 识别结果</p>
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
    </>
  );
}
