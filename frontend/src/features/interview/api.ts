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
import { run } from "@/lib/api-result";
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
  return run(
    companyInterviewsProposeInterview({
      body: {
        applicationId: body.applicationId,
        message: body.message,
        location: body.location ?? "",
        durationMinutes: body.durationMinutes ?? 0,
        slots: body.slots,
        expiresInDays: body.expiresInDays ?? 0,
      },
    }),
    "日程提案に失敗しました",
  );
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
  return (await run(
    companyInterviewsListCompanyInterviews({
      query: { from, to },
    }),
    "面接一覧の取得に失敗しました",
  )) as CompanyInterviewsResponse;
}

export async function cancelInterviewAsCompany(interviewId: string): Promise<void> {
  await run(
    companyInterviewsCancelCompanyInterview({
      path: { interviewId },
    }),
    "キャンセルに失敗しました",
  );
}

// --- Candidate side ---

export async function fetchCandidateInterviews(): Promise<CandidateInterviewsResponse> {
  return (await run(
    candidateInterviewsListCandidateInterviews(),
    "面接一覧の取得に失敗しました",
  )) as CandidateInterviewsResponse;
}

export async function selectSlot(
  proposalId: string,
  slotId: string,
  startTime?: string,
  endTime?: string,
): Promise<{ interview: { id: string; startTime: string; endTime: string; status: string } }> {
  return run(
    candidateInterviewsSelectInterviewSlot({
      path: { proposalId },
      body: { slotId, startTime: startTime ?? "", endTime: endTime ?? "" },
    }),
    "日程選択に失敗しました",
  );
}

export async function fetchProposalSlots(proposalId: string): Promise<ModelsProposalSlotsResponse> {
  return run(
    candidateInterviewsGetProposalSlots({
      path: { proposalId },
    }),
    "提案の取得に失敗しました",
  );
}

export async function cancelInterviewAsCandidate(interviewId: string): Promise<void> {
  await run(
    candidateInterviewsCancelCandidateInterview({
      path: { interviewId },
    }),
    "キャンセルに失敗しました",
  );
}
