"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { fetchCompanyUnreadCount } from "./api";

type CompanyUnreadContextType = {
  unreadCount: number;
  refresh: () => void;
};

const CompanyUnreadContext = createContext<CompanyUnreadContextType>({
  unreadCount: 0,
  refresh: () => {},
});

export function CompanyUnreadMessagingProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    fetchCompanyUnreadCount()
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CompanyUnreadContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </CompanyUnreadContext.Provider>
  );
}

export function useCompanyUnreadMessaging() {
  return useContext(CompanyUnreadContext);
}
