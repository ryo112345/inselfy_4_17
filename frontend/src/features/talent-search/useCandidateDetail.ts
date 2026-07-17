"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCandidateDetail, type TalentCard } from "./api";
import { candidateDetailQueryKey } from "./queryKeys";

/**
 * 選択中候補者の詳細（WV/CIスコア・職歴・スキル・自己紹介）を取得するフック。
 * React Query が queryFn に AbortSignal を渡すため、候補者の高速切替時に
 * 古いリクエストは自動で中断される（従来の AbortController 手動管理は不要）。
 */
export function useCandidateDetail(users: TalentCard[], selectedUserId: string | null) {
  const user = selectedUserId ? (users.find((u) => u.userId === selectedUserId) ?? null) : null;

  const query = useQuery({
    queryKey: candidateDetailQueryKey(user?.username, selectedUserId),
    queryFn: ({ signal }) =>
      // enabled ガードにより user / selectedUserId は非 null が保証される
      fetchCandidateDetail(user?.username ?? "", selectedUserId ?? "", signal),
    enabled: !!user && !!selectedUserId,
  });

  return {
    wvScores: query.data?.wvScores ?? null,
    ciScores: query.data?.ciScores ?? null,
    loading: query.isLoading,
    error: query.isError,
    experiences: query.data?.experiences ?? [],
    skills: query.data?.skills ?? [],
    about: query.data?.about ?? null,
    reload: () => {
      void query.refetch();
    },
  };
}
