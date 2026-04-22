"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

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
    await fetch("/api/company/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setCompany(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<CompanyUser> => {
      const res = await fetch("/api/company/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.message || "Login failed");
        (err as any).code = data.code;
        throw err;
      }
      const data: CompanyUser = await res.json();
      setCompany(data);
      return data;
    },
    [],
  );

  useEffect(() => {
    fetch("/api/company/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          setCompany(await res.json());
          return;
        }
        const refreshRes = await fetch("/api/company/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (refreshRes.ok) {
          setCompany(await refreshRes.json());
        }
      })
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

  return (
    <CompanyAuthContext value={value}>{children}</CompanyAuthContext>
  );
}

export function useCompanyAuth() {
  const ctx = useContext(CompanyAuthContext);
  if (!ctx) {
    throw new Error(
      "useCompanyAuth must be used within CompanyAuthProvider",
    );
  }
  return ctx;
}
