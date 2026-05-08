import type {
  CompanyInterviewsResponse,
  CandidateInterviewsResponse,
} from "./types";

// --- Company side ---

export async function proposeInterview(body: {
  applicationId: string;
  message: string;
  location?: string;
  durationMinutes?: number;
  slots: { startTime: string; endTime: string }[];
  expiresInDays?: number;
}): Promise<{ proposalId: string }> {
  const res = await fetch("/api/company/interviews/propose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "日程提案に失敗しました");
  }
  return res.json();
}

export async function fetchCompanyInterviews(
  from: string,
  to: string,
): Promise<CompanyInterviewsResponse> {
  const res = await fetch(
    `/api/company/interviews?from=${from}&to=${to}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("面接一覧の取得に失敗しました");
  return res.json();
}

export async function cancelInterviewAsCompany(
  interviewId: string,
): Promise<void> {
  const res = await fetch(`/api/company/interviews/${interviewId}/cancel`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("キャンセルに失敗しました");
}

// --- Candidate side ---

export async function fetchCandidateInterviews(): Promise<CandidateInterviewsResponse> {
  const res = await fetch("/api/interviews", { credentials: "include" });
  if (!res.ok) throw new Error("面接一覧の取得に失敗しました");
  return res.json();
}

export async function selectSlot(
  proposalId: string,
  slotId: string,
  startTime?: string,
  endTime?: string,
): Promise<{ interview: { id: string; startTime: string; endTime: string; status: string } }> {
  const res = await fetch(`/api/interviews/proposals/${proposalId}/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ slotId, startTime, endTime }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "日程選択に失敗しました");
  }
  return res.json();
}

export async function fetchProposalSlots(proposalId: string) {
  const res = await fetch(`/api/interviews/proposals/${proposalId}/slots`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("提案の取得に失敗しました");
  return res.json();
}

export async function cancelInterviewAsCandidate(
  interviewId: string,
): Promise<void> {
  const res = await fetch(`/api/interviews/${interviewId}/cancel`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("キャンセルに失敗しました");
}
