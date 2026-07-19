// カレンダー・WS 連動の命令的フロー（calendar / SlotPicker / MessageBubble 等）から
// 呼ばれる薄いラッパー層。デフォルト値の補完・エラー握り潰しの加工があるため
// 手書きを維持し、内部だけ orval 生成の平関数に置き換えている。
// 非2xx は mutator が ApiError を throw する。
import {
  candidateInterviewsCancelCandidateInterview,
  candidateInterviewsGetProposalSlots,
  candidateInterviewsListCandidateInterviews,
  candidateInterviewsSelectInterviewSlot,
  companyInterviewsCancelCompanyInterview,
  companyInterviewsGetPendingProposal,
  companyInterviewsListCompanyInterviews,
  companyInterviewsProposeInterview,
} from "@/external/client/api/orval/generated/endpoints/interviews/interviews";
import type { ModelsProposalSlotsResponse } from "@/external/client/api/orval/generated/models";
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
  return companyInterviewsProposeInterview({
    applicationId: body.applicationId,
    message: body.message,
    location: body.location ?? "",
    durationMinutes: body.durationMinutes ?? 0,
    slots: body.slots,
    expiresInDays: body.expiresInDays ?? 0,
  });
}

export async function checkPendingProposal(
  applicationId: string,
): Promise<{ hasPending: boolean; proposalId?: string; createdAt?: string }> {
  try {
    return await companyInterviewsGetPendingProposal(applicationId);
  } catch {
    return { hasPending: false };
  }
}

export async function fetchCompanyInterviews(
  from: string,
  to: string,
): Promise<CompanyInterviewsResponse> {
  return (await companyInterviewsListCompanyInterviews({ from, to })) as CompanyInterviewsResponse;
}

export async function cancelInterviewAsCompany(interviewId: string): Promise<void> {
  await companyInterviewsCancelCompanyInterview(interviewId);
}

// --- Candidate side ---

export async function fetchCandidateInterviews(): Promise<CandidateInterviewsResponse> {
  return (await candidateInterviewsListCandidateInterviews()) as CandidateInterviewsResponse;
}

export async function selectSlot(
  proposalId: string,
  slotId: string,
  startTime?: string,
  endTime?: string,
): Promise<{ interview: { id: string; startTime: string; endTime: string; status: string } }> {
  return candidateInterviewsSelectInterviewSlot(proposalId, {
    slotId,
    startTime: startTime ?? "",
    endTime: endTime ?? "",
  });
}

export async function fetchProposalSlots(proposalId: string): Promise<ModelsProposalSlotsResponse> {
  return candidateInterviewsGetProposalSlots(proposalId);
}

export async function cancelInterviewAsCandidate(interviewId: string): Promise<void> {
  await candidateInterviewsCancelCandidateInterview(interviewId);
}
