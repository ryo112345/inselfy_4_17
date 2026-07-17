"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * React Query のクライアント境界。SSR とブラウザでインスタンスが共有されないよう
 * useState の初期化子で生成する。
 * - staleTime 30s: 一覧→詳細→戻る でキャッシュを効かせる（要調整の出発点）
 * - retry 1: 401 が正常系の呼び出しがあるため多重リトライしない
 * - refetchOnWindowFocus false: フォーカス時の暗黙再取得は従来挙動に無いため無効
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* フローティングボタンがページ内のボタン（プロフィールのパネルナビ等）を
          覆ってクリックを塞ぐため、使いたいときだけ NEXT_PUBLIC_RQ_DEVTOOLS=1 で有効化する */}
      {process.env.NEXT_PUBLIC_RQ_DEVTOOLS === "1" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
