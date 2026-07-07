"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { checkPendingProposal } from "@/features/interview/api";
import { fetchJobPosting, fetchJobPostings } from "@/features/job-posting/api";
import {
  type CandidateDetail,
  fetchCandidateDetail,
  fetchTeamScoreAverages,
} from "@/features/talent-search/api";
import type { JobApplication, JobApplicationStatus } from "./api";
import { fetchCompanyApplications, updateApplicationStatus } from "./api";
import { type DatePreset, datePresetToRange } from "./constants";

/**
 * 応募一覧ページの状態（フィルタ・結果・選択中応募の詳細・チーム平均・
 * ステータス更新・URL同期）を内包するフック。挙動は分割前のページと同一。
 */
export function useApplicationsSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStatus = searchParams.get("status") ?? "";
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [jobFilter, setJobFilter] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("");
  const [jobPostings, setJobPostings] = useState<{ id: string; title: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("selected") ?? null);
  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [pendingProposal, setPendingProposal] = useState<{
    hasPending: boolean;
    createdAt?: string;
  } | null>(null);

  const [teamWvAvg, setTeamWvAvg] = useState<{ id: string; score: number }[] | null>(null);
  const [teamCiAvg, setTeamCiAvg] = useState<{ id: string; score: number }[] | null>(null);
  const [teamName, setTeamName] = useState<string>("");

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    fetchJobPostings()
      .then((jobs) => setJobPostings(jobs.map((j) => ({ id: j.id, title: j.title }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setKeyword(keywordInput), 300);
    return () => clearTimeout(t);
  }, [keywordInput]);

  const dateRange = useMemo(() => datePresetToRange(datePreset), [datePreset]);

  const load = useCallback(
    (status: string, jobPostingId: string, kw: string, dr: { from?: string; to?: string }) => {
      setLoading(true);
      fetchCompanyApplications({
        status: status || undefined,
        jobPostingId: jobPostingId || undefined,
        keyword: kw || undefined,
        dateFrom: dr.from,
        dateTo: dr.to,
        limit: 50,
        offset: 0,
      })
        .then((res) => {
          const items = res.items ?? [];
          setApplications(items);
          setTotal(res.total);
          setSelectedId((prev) => {
            if (prev && items.some((a) => a.id === prev)) return prev;
            return items[0]?.id ?? null;
          });
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    load(statusFilter, jobFilter, keyword, dateRange);
  }, [statusFilter, jobFilter, keyword, dateRange, load]);

  useEffect(() => {
    if (!selected?.id) {
      setPendingProposal(null);
      return;
    }
    checkPendingProposal(selected.id)
      .then(setPendingProposal)
      .catch(() => setPendingProposal(null));
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.jobPostingId) {
      setTeamWvAvg(null);
      setTeamCiAvg(null);
      setTeamName("");
      return;
    }
    fetchJobPosting(selected.jobPostingId)
      .then((job) => {
        if (!job.teamId) {
          setTeamWvAvg(null);
          setTeamCiAvg(null);
          setTeamName("");
          return;
        }
        setTeamName("チーム");
        return fetchTeamScoreAverages(job.teamId).then(({ wvAvg, ciAvg }) => {
          setTeamWvAvg(wvAvg);
          setTeamCiAvg(ciAvg);
        });
      })
      .catch(() => {
        setTeamWvAvg(null);
        setTeamCiAvg(null);
        setTeamName("");
      });
  }, [selected?.jobPostingId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 分割前と同じく応募の切替（id含む）で再取得する
  useEffect(() => {
    if (!selected?.candidateUsername) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetchCandidateDetail(selected.candidateUsername, selected.candidateId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selected?.candidateUsername, selected?.candidateId, selected?.id]);

  // Sync selectedId and statusFilter to URL for back-navigation
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (selectedId) params.set("selected", selectedId);
    const qs = params.toString();
    const target = qs ? `/company/applications?${qs}` : "/company/applications";
    router.replace(target, { scroll: false });
  }, [selectedId, statusFilter, router]);

  const handleStatusChange = async (applicationId: string, newStatus: JobApplicationStatus) => {
    try {
      await updateApplicationStatus(applicationId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a)),
      );
    } catch {
      load(statusFilter, jobFilter, keyword, dateRange);
    }
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
