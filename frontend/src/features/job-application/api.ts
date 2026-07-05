import "@/external/client/api/client";
import {
  candidateApplicationsApplyToJob,
  candidateApplicationsCheckApplied,
  candidateApplicationsListCandidateApplications,
  candidateApplicationsWithdrawApplication,
  companyApplicationsListCompanyApplications,
  companyApplicationsUpdateApplicationStatus,
  type ModelsJobApplicationListResponse,
  type ModelsJobApplicationResponse,
} from "@/external/client/api/generated";

export type JobApplication = ModelsJobApplicationResponse;
export type JobApplicationListResponse = ModelsJobApplicationListResponse;

export async function applyToJob(
  jobPostingId: string,
  message?: string,
): Promise<JobApplication> {
  const { data, error } = await candidateApplicationsApplyToJob({
    body: { jobPostingId, message: message ?? "" },
  });
  if (error || !data) {
    throw new Error(error?.message ?? "応募に失敗しました");
  }
  return data;
}

export async function checkApplied(jobPostingId: string): Promise<boolean> {
  const { data, error } = await candidateApplicationsCheckApplied({
    query: { jobPostingId },
  });
  if (error || !data) return false;
  return data.applied;
}

export async function fetchCandidateApplications(): Promise<JobApplicationListResponse> {
  const { data, error } = await candidateApplicationsListCandidateApplications();
  if (error || !data) throw new Error("Failed to fetch applications");
  return data;
}

export async function withdrawApplication(
  applicationId: string,
): Promise<void> {
  const { error } = await candidateApplicationsWithdrawApplication({
    path: { applicationId },
  });
  if (error) throw new Error("Failed to withdraw application");
}

export async function fetchCompanyApplications(params?: {
  status?: string;
  jobPostingId?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}): Promise<JobApplicationListResponse> {
  const { data, error } = await companyApplicationsListCompanyApplications({
    query: {
      status: params?.status || undefined,
      job_posting_id: params?.jobPostingId || undefined,
      keyword: params?.keyword || undefined,
      date_from: params?.dateFrom || undefined,
      date_to: params?.dateTo || undefined,
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    },
  });
  if (error || !data) throw new Error("Failed to fetch applications");
  return data;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: string,
): Promise<void> {
  const { error } = await companyApplicationsUpdateApplicationStatus({
    path: { applicationId },
    body: { status },
  });
  if (error) throw new Error("Failed to update status");
}
