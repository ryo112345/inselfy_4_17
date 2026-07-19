"use client";

// クライアント側の検証:
// 1. skipAuthRedirect 付きの生成フック — 未ログインでも /login に飛ばず 401 が error に乗る
// 2. skip なしの平関数呼び出し（ボタン）— 未ログインなら refresh 失敗後 /login へリダイレクト
// 3. 候補者 getMe（ボタン）— アクセストークン失効+refresh 有効時に 401→refresh→リトライ成功
import { useState } from "react";
import { skipAuthRedirect } from "@/external/client/api/orval/custom-fetch";
import { authGetMe } from "@/external/client/api/orval/generated/endpoints/auth/auth";
import { companyAuthCompanyGetMe } from "@/external/client/api/orval/generated/endpoints/company-auth/company-auth";
import {
  getCompanyMessagingCountCompanyUnreadMessagesQueryKey,
  useCompanyMessagingCountCompanyUnreadMessages,
} from "@/external/client/api/orval/generated/endpoints/messaging/messaging";
import { ApiError } from "@/lib/api-result";

export function OrvalCheckClient() {
  const unread = useCompanyMessagingCountCompanyUnreadMessages({
    query: { retry: false, queryKey: getCompanyMessagingCountCompanyUnreadMessagesQueryKey() },
    request: skipAuthRedirect,
  });
  const [noSkipResult, setNoSkipResult] = useState("(未実行)");
  const [userMeResult, setUserMeResult] = useState("(未実行)");

  const unreadText = unread.isPending
    ? "HOOK_PENDING"
    : unread.isError
      ? `HOOK_ERR: ${unread.error instanceof ApiError ? unread.error.code : String(unread.error)}`
      : `HOOK_OK: ${unread.data.count}`;

  return (
    <div className="space-y-4">
      <p data-testid="hook-result">{unreadText}</p>
      <button
        type="button"
        data-testid="no-skip-button"
        className="rounded border px-3 py-1"
        onClick={() => {
          companyAuthCompanyGetMe()
            .then((me) => setNoSkipResult(`NOSKIP_OK: ${me.companyName}`))
            .catch((err) =>
              setNoSkipResult(`NOSKIP_ERR: ${err instanceof ApiError ? err.code : String(err)}`),
            );
        }}
      >
        skip なしで getMe を呼ぶ
      </button>
      <p data-testid="no-skip-result">{noSkipResult}</p>
      <button
        type="button"
        data-testid="user-me-button"
        className="rounded border px-3 py-1"
        onClick={() => {
          authGetMe()
            .then((me) => setUserMeResult(`USERME_OK: ${me.username}`))
            .catch((err) =>
              setUserMeResult(`USERME_ERR: ${err instanceof ApiError ? err.code : String(err)}`),
            );
        }}
      >
        候補者 getMe を呼ぶ
      </button>
      <p data-testid="user-me-result">{userMeResult}</p>
    </div>
  );
}
