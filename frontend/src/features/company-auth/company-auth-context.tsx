"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { refreshToken } from "@/external/client/api/refresh";
import { ApiError } from "@/lib/api-result";

type CompanyUser = {
  id: string;
  email: string;
  companyName: string;
  contactPersonName: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
};

type CompanyAuthContextValue = {
  company: CompanyUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<CompanyUser>;
  logout: () => void;
  companyFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
};

const CompanyAuthContext = createContext<CompanyAuthContextValue | null>(null);

export function CompanyAuthProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<CompanyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await fetch("/api/company/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setCompany(null);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<CompanyUser> => {
    const res = await fetch("/api/company/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.code ?? "UNKNOWN", data.message || "Login failed");
    }
    const data: CompanyUser = await res.json();
    setCompany(data);
    return data;
  }, []);

  // refresh は共有の単一飛行を必ず経由する（refresh.ts 参照）。独自に fetch すると
  // SDK インターセプタ側の refresh とローテーションが衝突し、負けた側の 401 応答
  // （clearedAuthCookies）が新トークンを消してしまう。共有 refresh は応答 body を
  // 返さないため、成功後に /me を取り直して company を更新する。
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshed = await refreshToken("company");
    if (refreshed) {
      const res = await fetch("/api/company/auth/me", { credentials: "include" });
      if (res.ok) setCompany(await res.json());
    }
    return refreshed;
  }, []);

  const companyFetch = useCallback(
    async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
      const opts = { ...init, credentials: "include" as RequestCredentials };
      let res = await fetch(input, opts);
      if (res.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) {
          res = await fetch(input, opts);
        }
      }
      return res;
    },
    [refreshSession],
  );

  useEffect(() => {
    fetch("/api/company/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          setCompany(await res.json());
          return;
        }
        await refreshSession();
      })
      .finally(() => setIsLoading(false));
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      company,
      isAuthenticated: !!company,
      isLoading,
      login,
      logout,
      companyFetch,
    }),
    [company, isLoading, login, logout, companyFetch],
  );

  return <CompanyAuthContext value={value}>{children}</CompanyAuthContext>;
}

export function useCompanyAuth() {
  const ctx = useContext(CompanyAuthContext);
  if (!ctx) {
    throw new Error("useCompanyAuth must be used within CompanyAuthProvider");
  }
  return ctx;
}
