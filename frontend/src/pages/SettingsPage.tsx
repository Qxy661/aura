import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { Eye, EyeOff, Zap, Save, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface LLMConfig {
  api_key: string;
  base_url: string;
  model: string;
}

interface TestResult {
  ok: boolean;
  latency_ms: number;
  error?: string;
  model?: string;
  sample?: string;
}

const STORAGE_KEY = "aura_llm_config";
const SYNC_TIME_KEY = "aura_llm_last_sync";

export default function SettingsPage() {
  const { showSuccess, showError, ToastContainer } = useToast();
  const [config, setConfig] = useState<LLMConfig>({ api_key: "", base_url: "", model: "" });
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConfig(JSON.parse(raw));
      const syncTime = localStorage.getItem(SYNC_TIME_KEY);
      if (syncTime) setLastSync(syncTime);
    } catch { /* ignore */ }
  }, []);

  const canSave = config.api_key.trim() !== "" && config.base_url.trim() !== "";

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post<TestResult>("/settings/llm/test", config);
      setTestResult(res);
    } catch (e: unknown) {
      setTestResult({ ok: false, latency_ms: 0, error: e instanceof Error ? e.message : "连接失败" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaved(false);
    const now = new Date().toLocaleString("zh-CN");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      await api.post("/settings/llm", config);
      localStorage.setItem(SYNC_TIME_KEY, now);
      setLastSync(now);
      setSaved(true);
      showSuccess("配置已保存并同步到服务器");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      localStorage.setItem(SYNC_TIME_KEY, now);
      setLastSync(now);
      setSaved(true);
      showError("服务器同步失败，已保存到本地");
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in-up">
      <PageHeader title="设置" subtitle="LLM 配置 · 个性化" mascotMood="thinking" />

      <div className="cute-card p-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤖</span>
          <h2 className="font-bold text-[15px]">AI 模型配置</h2>
        </div>

        {/* API URL */}
        <div>
          <label className="block text-xs font-bold text-[var(--color-muted-foreground)] mb-1.5">
            API 地址 <span className="text-[var(--color-destructive)]">*</span>
          </label>
          <input
            className="cute-input"
            placeholder="https://api.example.com/v1"
            value={config.base_url}
            onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
          />
        </div>

        {/* API Key */}
        <div>
          <label className="block text-xs font-bold text-[var(--color-muted-foreground)] mb-1.5">
            API Key <span className="text-[var(--color-destructive)]">*</span>
          </label>
          <div className="relative">
            <input
              className="cute-input pr-10"
              type={showKey ? "text" : "password"}
              placeholder="sk-..."
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Model */}
        <div>
          <label className="block text-xs font-bold text-[var(--color-muted-foreground)] mb-1.5">
            模型名称
          </label>
          <input
            className="cute-input"
            placeholder="gpt-4o-mini"
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
          />
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
              testResult.ok
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {testResult.ok ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
            <div>
              {testResult.ok ? (
                <span>连接成功！延迟 {testResult.latency_ms}ms · {testResult.model}</span>
              ) : (
                <span>{testResult.error}</span>
              )}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            className="btn-soft flex items-center gap-2 flex-1 justify-center"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            测试连接
          </button>
          <button
            className="btn-primary flex items-center gap-2 flex-1 justify-center disabled:opacity-40"
            onClick={handleSave}
            disabled={saving || !canSave}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saved ? "已保存 ✓" : "保存配置"}
          </button>
        </div>

        {lastSync && (
          <p className="text-[10px] text-[var(--color-muted-foreground)] text-center">
            上次同步: {lastSync}
          </p>
        )}
      </div>

      {/* Info card */}
      <div className="cute-card p-4 mt-4">
        <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
          💡 配置保存在浏览器本地，同时同步到后端。支持所有 OpenAI 兼容接口（DeepSeek、Mimo、OpenRouter 等）。
          修改后所有 AI 功能将使用新配置。
        </p>
      </div>
      <ToastContainer />
    </div>
  );
}
