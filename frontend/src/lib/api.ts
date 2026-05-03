const BASE = import.meta.env.VITE_API_URL || "/api";

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
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
