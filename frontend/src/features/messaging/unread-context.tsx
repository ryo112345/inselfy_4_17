"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

type UnreadMessagingContextType = {
  unreadCount: number;
  refresh: () => void;
};

const UnreadMessagingContext = createContext<UnreadMessagingContextType>({
  unreadCount: 0,
  refresh: () => {},
});

export function UnreadMessagingProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    fetch("/api/messages/unread-count", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUnreadCount(data?.count ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <UnreadMessagingContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </UnreadMessagingContext.Provider>
  );
}

export function useUnreadMessaging() {
  return useContext(UnreadMessagingContext);
}
