import "@/external/client/api/client";
import {
  candidateInterviewsCancelCandidateInterview,
  candidateInterviewsGetProposalSlots,
  candidateInterviewsListCandidateInterviews,
  candidateInterviewsSelectInterviewSlot,
  companyInterviewsCancelCompanyInterview,
  companyInterviewsGetPendingProposal,
  companyInterviewsListCompanyInterviews,
  companyInterviewsProposeInterview,
  type ModelsProposalSlotsResponse,
} from "@/external/client/api/generated";
import type { CandidateInterviewsResponse, CompanyInterviewsResponse } from "./types";

// --- Company side ---

export async function proposeInterview(body: {
  applicationId: string;
  message: string;
  location?: string;
  durationMinutes?: number;
  slots: { startTime: string; endTime: string }[];
  expiresInDays?: number;
}): Promise<{ proposalId: string }> {
  // location/durationMinutes/expiresInDays の未指定はゼロ値扱い（バックエンドがデフォルト適用）
  const { data, error } = await companyInterviewsProposeInterview({
    body: {
      applicationId: body.applicationId,
      message: body.message,
      location: body.location ?? "",
      durationMinutes: body.durationMinutes ?? 0,
      slots: body.slots,
      expiresInDays: body.expiresInDays ?? 0,
    },
  });
  if (error || !data) {
    throw new Error(error?.message ?? "日程提案に失敗しました");
  }
  return data;
}

export async function checkPendingProposal(
  applicationId: string,
): Promise<{ hasPending: boolean; proposalId?: string; createdAt?: string }> {
  const { data, error } = await companyInterviewsGetPendingProposal({
    path: { applicationId },
  });
  if (error || !data) return { hasPending: false };
  return data;
}

export async function fetchCompanyInterviews(
  from: string,
  to: string,
): Promise<CompanyInterviewsResponse> {
  const { data, error } = await companyInterviewsListCompanyInterviews({
    query: { from, to },
  });
  if (error || !data) throw new Error("面接一覧の取得に失敗しました");
  return data as CompanyInterviewsResponse;
}

export async function cancelInterviewAsCompany(interviewId: string): Promise<void> {
  const { error } = await companyInterviewsCancelCompanyInterview({
    path: { interviewId },
  });
  if (error) throw new Error("キャンセルに失敗しました");
}

// --- Candidate side ---

export async function fetchCandidateInterviews(): Promise<CandidateInterviewsResponse> {
  const { data, error } = await candidateInterviewsListCandidateInterviews();
  if (error || !data) throw new Error("面接一覧の取得に失敗しました");
  return data as CandidateInterviewsResponse;
}

export async function selectSlot(
  proposalId: string,
  slotId: string,
  startTime?: string,
  endTime?: string,
): Promise<{ interview: { id: string; startTime: string; endTime: string; status: string } }> {
  const { data, error } = await candidateInterviewsSelectInterviewSlot({
    path: { proposalId },
    body: { slotId, startTime: startTime ?? "", endTime: endTime ?? "" },
  });
  if (error || !data) {
    throw new Error(error?.message ?? "日程選択に失敗しました");
  }
  return data;
}

export async function fetchProposalSlots(proposalId: string): Promise<ModelsProposalSlotsResponse> {
  const { data, error } = await candidateInterviewsGetProposalSlots({
    path: { proposalId },
  });
  if (error || !data) throw new Error("提案の取得に失敗しました");
  return data;
}

export async function cancelInterviewAsCandidate(interviewId: string): Promise<void> {
  const { error } = await candidateInterviewsCancelCandidateInterview({
    path: { interviewId },
  });
  if (error) throw new Error("キャンセルに失敗しました");
}
