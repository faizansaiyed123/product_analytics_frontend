export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown, public requestId?: string) {
    super(message);
    this.name = "ApiError";
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export const onUnauthorized = (fn: Listener) => { unauthorizedListeners.add(fn); return () => { unauthorizedListeners.delete(fn); }; };

function csrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)pa_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

const FRIENDLY: Record<string, string> = {
  INVALID_CREDENTIALS: "Incorrect email or password.",
  EMAIL_TAKEN: "An account with this email already exists.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  CSRF_FAILED: "Your session security token expired. Please reload the page.",
  FORBIDDEN: "You don't have permission to do that.",
};

export function messageFor(err: unknown): string {
  if (err instanceof ApiError) return FRIENDLY[err.code] ?? err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; params?: Record<string, unknown>; signal?: AbortSignal } = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const url = new URL(`/api/v1${path}`, window.location.origin);
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, String(x)));
    else url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = csrfToken();
  let res: Response;
  try {
    res = await fetch(url, { method, headers, credentials: "include", body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined, signal: opts.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the server. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: any = undefined;
  try { data = text ? JSON.parse(text) : undefined; } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const e = data?.error;
    if (res.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/register")) unauthorizedListeners.forEach((f) => f());
    throw new ApiError(res.status, e?.code ?? "HTTP_ERROR", e?.message ?? `Request failed (${res.status})`, e?.details, e?.request_id);
  }
  return data as T;
}

export function downloadUrl(path: string, params: Record<string, unknown>): string {
  const url = new URL(`/api/v1${path}`, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, String(x)));
    else url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  return url.toString();
}

export async function downloadPost(path: string, body: unknown, filename: string): Promise<void> {
  const res = await fetch(`/api/v1${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() }, body: JSON.stringify(body) });
  if (!res.ok) throw new ApiError(res.status, "EXPORT_FAILED", "Export failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
