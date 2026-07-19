// 求人 CRUD・公開検索・画像アップロードの薄いラッパー層。React Query の queryFn
// （useApplicationsSearch / useJobSearch 等）と命令的なフォームフローの両方から
// 呼ばれるため関数シグネチャを維持し、内部だけ orval 生成の平関数に置き換えている。
// 非2xx は mutator が ApiError を throw する。
import {
  companyJobPostingsCreateJobPosting,
  companyJobPostingsDeleteJobPosting,
  companyJobPostingsGetCompanyJobPosting,
  companyJobPostingsListCompanyJobPostings,
  companyJobPostingsUpdateJobPosting,
  companyJobPostingsUploadGalleryImage,
  companyJobPostingsUploadJobCoverImage,
  companyJobPostingsUploadTeamMemberPhoto,
  publicJobPostingsGetPublicJobPosting,
  publicJobPostingsListPublicJobPostings,
} from "@/external/client/api/orval/generated/endpoints/job-postings/job-postings";
import type { ModelsJobPostingRequest } from "@/external/client/api/orval/generated/models";
import type { JobPosting } from "../scout/types";

export type JobPostingWithCompany = JobPosting & {
  companyName: string;
  companyLogoUrl: string;
};

export type JobPostingBody = ModelsJobPostingRequest;

export async function createJobPosting(body: JobPostingBody): Promise<JobPosting> {
  return (await companyJobPostingsCreateJobPosting(body)) as JobPosting;
}

export async function fetchJobPostings(): Promise<JobPosting[]> {
  const data = await companyJobPostingsListCompanyJobPostings();
  return data.items as JobPosting[];
}

export async function fetchJobPosting(id: string): Promise<JobPosting> {
  return (await companyJobPostingsGetCompanyJobPosting(id)) as JobPosting;
}

export async function updateJobPosting(id: string, body: JobPostingBody): Promise<JobPosting> {
  return (await companyJobPostingsUpdateJobPosting(id, body)) as JobPosting;
}

export async function deleteJobPosting(id: string): Promise<void> {
  await companyJobPostingsDeleteJobPosting(id);
}

export type JobSearchParams = {
  search?: string;
  category?: string;
  employmentType?: string;
  remotePolicy?: string;
  sort?: "newest" | "salary";
  limit?: number;
  offset?: number;
  valueFilters?: string;
  filterMode?: "values" | "needs";
};

export type PaginatedJobPostingsResponse = {
  items: JobPostingWithCompany[];
  total: number;
};

export async function searchPublicJobPostings(
  params: JobSearchParams = {},
  signal?: AbortSignal,
): Promise<PaginatedJobPostingsResponse> {
  return (await publicJobPostingsListPublicJobPostings(
    {
      search: params.search || undefined,
      category: params.category || undefined,
      employmentType: params.employmentType || undefined,
      remotePolicy: params.remotePolicy || undefined,
      sort: params.sort || undefined,
      valueFilters: params.valueFilters || undefined,
      filterMode: params.filterMode || undefined,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    },
    { signal },
  )) as PaginatedJobPostingsResponse;
}

export async function fetchPublicJobPosting(id: string): Promise<JobPosting> {
  return (await publicJobPostingsGetPublicJobPosting(id)) as JobPosting;
}

export async function uploadTeamMemberPhoto(file: File): Promise<string> {
  const data = await companyJobPostingsUploadTeamMemberPhoto({ file });
  return data.url;
}

export async function uploadCoverImage(file: File): Promise<string> {
  const data = await companyJobPostingsUploadJobCoverImage({ file });
  return data.url;
}

export async function uploadGalleryImage(file: File): Promise<string> {
  const data = await companyJobPostingsUploadGalleryImage({ file });
  return data.url;
}
