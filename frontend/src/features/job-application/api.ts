// 応募系の手書きラッパー層。orval 生成平関数（非2xxで ApiError throw）を呼ぶ。
// 応募一覧ページ（useApplicationsSearch）は生成フックを直接使うため、ここには
// 「他 feature からも呼ばれる関数」と「エラーの意味変換があるもの」だけを置く。
import {
  candidateApplicationsApplyToJob,
  candidateApplicationsCheckApplied,
  companyApplicationsListCompanyApplications,
} from "@/external/client/api/orval/generated/endpoints/job-applications/job-applications";
import type {
  ModelsJobApplicationListResponse,
  ModelsJobApplicationResponse,
  ModelsJobApplicationStatus,
} from "@/external/client/api/orval/generated/models";

export type JobApplication = ModelsJobApplicationResponse;
export type JobApplicationListResponse = ModelsJobApplicationListResponse;
export type JobApplicationStatus = ModelsJobApplicationStatus;

export async function applyToJob(jobPostingId: string, message?: string): Promise<JobApplication> {
  return candidateApplicationsApplyToJob({ jobPostingId, message: message ?? "" });
}

// 未応募・未ログイン等のエラーは「未応募」として扱う（旧実装と同じ）
export async function checkApplied(jobPostingId: string): Promise<boolean> {
  try {
    const data = await candidateApplicationsCheckApplied({ jobPostingId });
    return data.applied;
  } catch {
    return false;
  }
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
  return companyApplicationsListCompanyApplications({
    status: params?.status || undefined,
    job_posting_id: params?.jobPostingId || undefined,
    keyword: params?.keyword || undefined,
    date_from: params?.dateFrom || undefined,
    date_to: params?.dateTo || undefined,
    limit: params?.limit ?? 50,
    offset: params?.offset ?? 0,
  });
}
