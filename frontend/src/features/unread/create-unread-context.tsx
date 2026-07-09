"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type UnreadContextValue = {
  unreadCount: number;
  refresh: () => void;
};

/**
 * 未読カウント Context の共通ファクトリ。
 * messaging（候補者/企業）・scout の3種の未読バッジはすべてこれで生成する。
 * エラー時は前回値を保持する（未読バッジなので UI 通知はしない）。
 */
export function createUnreadContext(name: string, fetchCount: () => Promise<number>) {
  const Context = createContext<UnreadContextValue>({
    unreadCount: 0,
    refresh: () => {},
  });

  function Provider({ children }: { children: ReactNode }) {
    const [unreadCount, setUnreadCount] = useState(0);

    const refresh = useCallback(() => {
      fetchCount()
        .then(setUnreadCount)
        .catch((err) => {
          console.error(`[${name}] failed to fetch unread count:`, err);
        });
    }, []);

    useEffect(() => {
      refresh();
    }, [refresh]);

    const value = useMemo(() => ({ unreadCount, refresh }), [unreadCount, refresh]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useUnread() {
    return useContext(Context);
  }

  return { Provider, useUnread };
}
