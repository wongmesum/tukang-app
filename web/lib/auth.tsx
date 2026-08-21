"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

interface User {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  role: string;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  apiFetch: <T = unknown>(path: string, opts?: { method?: string; body?: unknown }) => Promise<T>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  token: null,
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
  apiFetch: async () => { throw new Error("no ctx"); },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("web_token");
    const u = localStorage.getItem("web_user");
    if (t) setToken(t);
    if (u) { try { setUser(JSON.parse(u)); } catch {} }
  }, []);

  const login = useCallback((t: string, u: User) => {
    setToken(t);
    setUser(u);
    localStorage.setItem("web_token", t);
    localStorage.setItem("web_user", JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("web_token");
    localStorage.removeItem("web_user");
  }, []);

  const apiFetch = useCallback(async <T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message ?? "API error");
    return json.data as T;
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn: !!token, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
