"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useTypewriter(fullText: string | null, charsPerTick = 2, intervalMs = 30) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const start = useCallback(() => {
    if (!fullText) return;
    indexRef.current = 0;
    setDisplayed("");
    setDone(false);

    timerRef.current = setInterval(() => {
      indexRef.current += charsPerTick;
      if (indexRef.current >= fullText.length) {
        indexRef.current = fullText.length;
        if (timerRef.current) clearInterval(timerRef.current);
        setDone(true);
      }
      setDisplayed(fullText.slice(0, indexRef.current));
    }, intervalMs);
  }, [fullText, charsPerTick, intervalMs]);

  const skip = useCallback(() => {
    if (!fullText) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed(fullText);
    setDone(true);
  }, [fullText]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  return { displayed, done, start, skip };
}
