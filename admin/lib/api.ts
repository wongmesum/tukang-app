const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

interface FetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message ?? "API error");
  }

  return json.data as T;
}

// Server-side helper: get admin token from env (simplified for MVP)
export function getAdminToken(): string {
  return process.env.ADMIN_JWT_TOKEN ?? "";
}
