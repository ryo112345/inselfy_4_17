"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type UnreadScoutContextType = {
  hasUnread: boolean;
  refresh: () => void;
};

const UnreadScoutContext = createContext<UnreadScoutContextType>({
  hasUnread: false,
  refresh: () => {},
});

export function UnreadScoutProvider({ children }: { children: React.ReactNode }) {
  const [hasUnread, setHasUnread] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/scouts?limit=50&offset=0")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const unread = data?.items?.some((s: { status: string }) => s.status === "sent") ?? false;
        setHasUnread(unread);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <UnreadScoutContext.Provider value={{ hasUnread, refresh }}>
      {children}
    </UnreadScoutContext.Provider>
  );
}

export function useUnreadScout() {
  return useContext(UnreadScoutContext);
}
