"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { skipAuthRedirect } from "@/external/client/api/orval/custom-fetch";
import {
  authGetMe,
  authGoogleLogin,
  authLogout,
} from "@/external/client/api/orval/generated/endpoints/auth/auth";

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
    await authLogout(skipAuthRedirect).catch(() => {});
    setUser(null);
  }, []);

  const login = useCallback(async (idToken: string): Promise<AuthUser> => {
    // 認証失敗（401）はログイン試行の正常系なので /login へは飛ばさない
    const data = await authGoogleLogin({ idToken }, skipAuthRedirect);
    setUser(data);
    return data;
  }, []);

  const updateUser = useCallback((updated: AuthUser) => {
    setUser(updated);
  }, []);

  // 401 → refresh → リトライは mutator（custom-fetch.ts）が共有 refresh.ts 経由で行う。
  // 未ログイン閲覧者も通る呼び出しなので skipAuthRedirect で /login 送りを抑止する。
  useEffect(() => {
    if (initialUser) return;
    authGetMe(skipAuthRedirect)
      .then((me) => setUser(me))
      .catch(() => {})
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
