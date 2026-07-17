"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { refreshToken } from "@/external/client/api/refresh";

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  email?: string | null;
  needsSetup?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (idToken: string) => Promise<AuthUser>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  // layout サーバー側で解決済みの閲覧者。渡されたらクライアント初回の
  // /api/auth/me フェッチを省略する。null は「サーバー側で未解決
  // （未ログイン or access token 失効）」を意味し、従来どおり
  // クライアント側で /me → refresh のフローを実行する。
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const login = useCallback(async (idToken: string): Promise<AuthUser> => {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      throw new Error("Login failed");
    }
    const data: AuthUser = await res.json();
    setUser(data);
    return data;
  }, []);

  const updateUser = useCallback((updated: AuthUser) => {
    setUser(updated);
  }, []);

  useEffect(() => {
    if (initialUser) return;
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          setUser(await res.json());
          return;
        }
        // refresh は共有の単一飛行を必ず経由する（refresh.ts 参照）。
        // 独自に fetch すると SDK インターセプタ側の refresh とローテーションが衝突し、
        // 負けた側の 401 応答（clearedAuthCookies）が新トークンを消してしまう。
        if (await refreshToken()) {
          const meRes = await fetch("/api/auth/me", { credentials: "include" });
          if (meRes.ok) setUser(await meRes.json());
        }
      })
      .finally(() => setIsLoading(false));
  }, [initialUser]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      updateUser,
    }),
    [user, isLoading, login, logout, updateUser],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
