"use client";

import { useEffect, useRef } from "react";

const INITIAL_DELAY_MS = 5_000;
const MAX_DELAY_MS = 60_000;

/**
 * enabled の間、指数バックオフ（5s → 10s → 20s … 上限 60s）で poll を再実行する。
 * poll は「継続するか」を返す（false で停止）。エラー時はバックオフして継続。
 * タブ非表示中はリクエストを発行しない（タイマーだけ回し、表示に戻った周期で再開）。
 * アンマウント・enabled=false でタイマーは解除される。
 */
export function usePolling(enabled: boolean, poll: () => Promise<boolean>) {
  const pollRef = useRef(poll);
  pollRef.current = poll;

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let delay = INITIAL_DELAY_MS;

    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        let keepGoing = true;
        try {
          keepGoing = await pollRef.current();
        } catch {
          // 失敗してもバックオフして再試行
        }
        if (stopped || !keepGoing) return;
        delay = Math.min(delay * 2, MAX_DELAY_MS);
      }
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, delay);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [enabled]);
}
