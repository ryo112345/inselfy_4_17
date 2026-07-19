"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { skipAuthRedirect } from "@/external/client/api/orval/custom-fetch";
import {
  companyAuthCompanyGetMe,
  companyAuthCompanyLogin,
  companyAuthCompanyLogout,
} from "@/external/client/api/orval/generated/endpoints/company-auth/company-auth";

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
};

const CompanyAuthContext = createContext<CompanyAuthContextValue | null>(null);

export function CompanyAuthProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<CompanyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await companyAuthCompanyLogout(skipAuthRedirect).catch(() => {});
    setCompany(null);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<CompanyUser> => {
    // 認証失敗（401）はログイン試行の正常系なので /company/login へは飛ばさない
    const data = await companyAuthCompanyLogin({ email, password }, skipAuthRedirect);
    setCompany(data);
    return data;
  }, []);

  // 401 → 企業 refresh → リトライは mutator（custom-fetch.ts）が共有 refresh.ts 経由で行う。
  // ここで独自に refresh すると rotation と衝突するため、生成クライアント以外で呼ばないこと。
  useEffect(() => {
    companyAuthCompanyGetMe(skipAuthRedirect)
      .then((me) => setCompany(me))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      company,
      isAuthenticated: !!company,
      isLoading,
      login,
      logout,
    }),
    [company, isLoading, login, logout],
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
