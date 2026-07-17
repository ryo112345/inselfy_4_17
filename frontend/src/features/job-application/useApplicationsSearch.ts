"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getCompanyApplicationsListCompanyApplicationsQueryKey,
  useCompanyApplicationsListCompanyApplications,
  useCompanyApplicationsUpdateApplicationStatus,
} from "@/external/client/api/orval/generated/endpoints/job-applications/job-applications";
import type {
  CompanyApplicationsListCompanyApplicationsParams,
  ModelsJobApplicationListResponse,
} from "@/external/client/api/orval/generated/models";
import { checkPendingProposal } from "@/features/interview/api";
import { fetchJobPosting, fetchJobPostings } from "@/features/job-posting/api";
import { fetchCandidateDetail, fetchTeamScoreAverages } from "@/features/talent-search/api";
import { candidateDetailQueryKey } from "@/features/talent-search/queryKeys";
import type { JobApplicationStatus } from "./api";
import { type DatePreset, datePresetToRange } from "./constants";

/**
 * 応募一覧ページの状態（フィルタ・結果・選択中応募の詳細・チーム平均・
 * ステータス更新・URL同期）を内包するフック。挙動は分割前のページと同一。
 */
export function useApplicationsSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const initialStatus = searchParams.get("status") ?? "";
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [jobFilter, setJobFilter] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("");
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("selected") ?? null);

  const jobPostingsQuery = useQuery({
    queryKey: ["job-posting", "companyList"],
    queryFn: fetchJobPostings,
  });
  const jobPostings = useMemo(
    () => (jobPostingsQuery.data ?? []).map((j) => ({ id: j.id, title: j.title })),
    [jobPostingsQuery.data],
  );

  useEffect(() => {
    const t = setTimeout(() => setKeyword(keywordInput), 300);
    return () => clearTimeout(t);
  }, [keywordInput]);

  const dateRange = useMemo(() => datePresetToRange(datePreset), [datePreset]);

  const listParams: CompanyApplicationsListCompanyApplicationsParams = {
    status: statusFilter || undefined,
    job_posting_id: jobFilter || undefined,
    keyword: keyword || undefined,
    date_from: dateRange.from,
    date_to: dateRange.to,
    limit: 50,
    offset: 0,
  };
  // キーは生成の getXxxQueryKey() を使う（setQueryData / invalidateQueries と必ず一致する）
  const activeListKey = getCompanyApplicationsListCompanyApplicationsQueryKey(listParams);

  const listQuery = useCompanyApplicationsListCompanyApplications(listParams);
  const applications = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isPending;
  const error = listQuery.error?.message ?? null;

  // 一覧の読み込み結果に合わせて選択を維持または先頭へリセット（従来の load 内処理と同一）
  useEffect(() => {
    const items = listQuery.data?.items;
    if (!items) return;
    setSelectedId((prev) => {
      if (prev && items.some((a) => a.id === prev)) return prev;
      return items[0]?.id ?? null;
    });
  }, [listQuery.data]);

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  const pendingProposalQuery = useQuery({
    queryKey: ["interview", "pendingProposal", selected?.id],
    queryFn: () => checkPendingProposal(selected?.id ?? ""),
    enabled: !!selected?.id,
  });
  const pendingProposal = (selected?.id ? pendingProposalQuery.data : null) ?? null;

  // 求人 → チーム平均の直列合成。値が2ソースから来るため queryFn 内で合成する
  const teamAveragesQuery = useQuery({
    queryKey: ["job-application", "applicationTeamAverages", selected?.jobPostingId],
    queryFn: async () => {
      const job = await fetchJobPosting(selected?.jobPostingId ?? "");
      if (!job.teamId) {
        return { teamName: "", wvAvg: null, ciAvg: null };
      }
      const { wvAvg, ciAvg } = await fetchTeamScoreAverages(job.teamId);
      return { teamName: "チーム", wvAvg, ciAvg };
    },
    enabled: !!selected?.jobPostingId,
  });
  const teamWvAvg = (selected?.jobPostingId ? teamAveragesQuery.data?.wvAvg : null) ?? null;
  const teamCiAvg = (selected?.jobPostingId ? teamAveragesQuery.data?.ciAvg : null) ?? null;
  const teamName = (selected?.jobPostingId ? teamAveragesQuery.data?.teamName : "") ?? "";

  // 候補者詳細。talent-search 側の useCandidateDetail とキーを共有し、
  // 応募（id）単位ではなく候補者単位でキャッシュする
  const detailQuery = useQuery({
    queryKey: candidateDetailQueryKey(selected?.candidateUsername, selected?.candidateId ?? null),
    queryFn: ({ signal }) =>
      fetchCandidateDetail(selected?.candidateUsername ?? "", selected?.candidateId ?? "", signal),
    enabled: !!selected?.candidateUsername,
  });
  const detail = (selected?.candidateUsername ? detailQuery.data : null) ?? null;
  const detailLoading = detailQuery.isLoading;

  // Sync selectedId and statusFilter to URL for back-navigation
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (selectedId) params.set("selected", selectedId);
    const qs = params.toString();
    const target = qs ? `/company/applications?${qs}` : "/company/applications";
    router.replace(target, { scroll: false });
  }, [selectedId, statusFilter, router]);

  const statusMutation = useCompanyApplicationsUpdateApplicationStatus({
    mutation: {
      onSuccess: (_data, { applicationId, data }) => {
        // 従来同様、表示中の一覧は再取得せず該当行だけ書き換える
        // （現フィルタから外れた行が即座に消えるのを避ける）
        queryClient.setQueryData<ModelsJobApplicationListResponse>(
          activeListKey,
          (old) =>
            old && {
              ...old,
              items: old.items.map((a) =>
                a.id === applicationId ? { ...a, status: data.status } : a,
              ),
            },
        );
        // 他フィルタのキャッシュは陳腐化しているので、次回表示時に再取得させる
        // （パラメータなしの生成キーは URL のみのキーになり、全フィルタ分に前方一致する）
        queryClient.invalidateQueries({
          queryKey: getCompanyApplicationsListCompanyApplicationsQueryKey(),
          refetchType: "none",
        });
      },
      onError: () => {
        queryClient.invalidateQueries({ queryKey: activeListKey });
      },
    },
  });

  const handleStatusChange = (applicationId: string, newStatus: JobApplicationStatus) => {
    statusMutation.mutate({ applicationId, data: { status: newStatus } });
  };

  const statusCounts = applications.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    applications,
    total,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    jobFilter,
    setJobFilter,
    keywordInput,
    setKeywordInput,
    keyword,
    datePreset,
    setDatePreset,
    jobPostings,
    selectedId,
    setSelectedId,
    selected,
    detail,
    detailLoading,
    pendingProposal,
    teamWvAvg,
    teamCiAvg,
    teamName,
    handleStatusChange,
    statusCounts,
  };
}
