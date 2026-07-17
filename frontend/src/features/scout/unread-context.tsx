"use client";

import { skipAuthRedirect } from "@/external/client/api/orval/custom-fetch";
import { candidateScoutsCountCandidateUnreadScouts } from "@/external/client/api/orval/generated/endpoints/candidate-scouts/candidate-scouts";
import { createUnreadContext } from "@/features/unread/create-unread-context";

// 未読バッジのベストエフォート取得。未ログインの 401 で /login に飛ばさない
const { Provider, useUnread } = createUnreadContext("scout", async () => {
  const { count } = await candidateScoutsCountCandidateUnreadScouts(skipAuthRedirect);
  return count;
});

export { Provider as UnreadScoutProvider, useUnread as useUnreadScout };
