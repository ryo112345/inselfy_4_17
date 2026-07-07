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
  type ModelsJobApplicationStatus,
} from "@/external/client/api/generated";
import { run } from "@/lib/api-result";

export type JobApplication = ModelsJobApplicationResponse;
export type JobApplicationListResponse = ModelsJobApplicationListResponse;
export type JobApplicationStatus = ModelsJobApplicationStatus;

export async function applyToJob(jobPostingId: string, message?: string): Promise<JobApplication> {
  return run(
    candidateApplicationsApplyToJob({
      body: { jobPostingId, message: message ?? "" },
    }),
    "応募に失敗しました",
  );
}

export async function checkApplied(jobPostingId: string): Promise<boolean> {
  const { data, error } = await candidateApplicationsCheckApplied({
    query: { jobPostingId },
  });
  if (error || !data) return false;
  return data.applied;
}

export async function fetchCandidateApplications(): Promise<JobApplicationListResponse> {
  return run(candidateApplicationsListCandidateApplications(), "Failed to fetch applications");
}

export async function withdrawApplication(applicationId: string): Promise<void> {
  await run(
    candidateApplicationsWithdrawApplication({
      path: { applicationId },
    }),
    "Failed to withdraw application",
  );
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
  return run(
    companyApplicationsListCompanyApplications({
      query: {
        status: params?.status || undefined,
        job_posting_id: params?.jobPostingId || undefined,
        keyword: params?.keyword || undefined,
        date_from: params?.dateFrom || undefined,
        date_to: params?.dateTo || undefined,
        limit: params?.limit ?? 50,
        offset: params?.offset ?? 0,
      },
    }),
    "Failed to fetch applications",
  );
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ModelsJobApplicationStatus,
): Promise<void> {
  await run(
    companyApplicationsUpdateApplicationStatus({
      path: { applicationId },
      body: { status },
    }),
    "Failed to update status",
  );
}
