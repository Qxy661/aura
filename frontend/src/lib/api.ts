const BASE = import.meta.env.VITE_API_URL || "/api";

// --- Backend wake-up on cold start ---
let _backendReady = false;
let _wakingUp = false;
const _wakeListeners: Set<() => void> = new Set();

export function onBackendReady(fn: () => void): () => void {
  _wakeListeners.add(fn);
  return () => { _wakeListeners.delete(fn); };
}

export function isBackendReady() {
  return _backendReady;
}

async function wakeBackend(): Promise<void> {
  if (_backendReady || _wakingUp) return;
  _wakingUp = true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    const res = await fetch(`${BASE}/../health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      _backendReady = true;
      _wakeListeners.forEach((fn) => fn());
    }
  } catch {
    // will retry on next request
  } finally {
    _wakingUp = false;
  }
}

function getLLMHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem("aura_llm_config");
    if (!raw) return {};
    const cfg = JSON.parse(raw);
    const h: Record<string, string> = {};
    if (cfg.api_key) h["X-LLM-API-Key"] = cfg.api_key;
    if (cfg.base_url) h["X-LLM-Base-URL"] = cfg.base_url;
    if (cfg.model) h["X-LLM-Model"] = cfg.model;
    return h;
  } catch {
    return {};
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Auto-wake on first request
  if (!_backendReady) {
    await wakeBackend();
  }

  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: {
          "Content-Type": "application/json",
          ...getLLMHeaders(),
          ...options?.headers,
        },
        ...options,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Request failed");
      }
      return res.json();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error("Request failed");
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
