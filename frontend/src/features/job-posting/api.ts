import "@/external/client/api/client";
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
  type ModelsJobPostingRequest,
} from "@/external/client/api/generated";
import type { JobPosting } from "../scout/types";

export type JobPostingWithCompany = JobPosting & {
  companyName: string;
  companyLogoUrl: string;
};

export type JobPostingBody = ModelsJobPostingRequest;

export async function createJobPosting(
  body: JobPostingBody,
): Promise<JobPosting> {
  const { data, error } = await companyJobPostingsCreateJobPosting({ body });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create job posting");
  }
  return data;
}

export async function fetchJobPostings(): Promise<JobPosting[]> {
  const { data, error } = await companyJobPostingsListCompanyJobPostings({
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch job postings");
  return data;
}

export async function fetchJobPosting(id: string): Promise<JobPosting> {
  const { data, error } = await companyJobPostingsGetCompanyJobPosting({
    path: { jobId: id },
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch job posting");
  return data;
}

export async function updateJobPosting(
  id: string,
  body: JobPostingBody,
): Promise<JobPosting> {
  const { data, error } = await companyJobPostingsUpdateJobPosting({
    path: { jobId: id },
    body,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update job posting");
  }
  return data;
}

export async function deleteJobPosting(id: string): Promise<void> {
  const { error } = await companyJobPostingsDeleteJobPosting({
    path: { jobId: id },
  });
  if (error) throw new Error("Failed to delete job posting");
}

export async function fetchPublicJobPostings(): Promise<JobPostingWithCompany[]> {
  const { data, error } = await publicJobPostingsListPublicJobPostings({
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch public job postings");
  // クエリなしの GET /api/jobs は裸配列を返す（二形レスポンスの bare 側）
  return (Array.isArray(data) ? data : data.items) as JobPostingWithCompany[];
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
): Promise<PaginatedJobPostingsResponse> {
  const { data, error } = await publicJobPostingsListPublicJobPostings({
    query: {
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
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch public job postings");
  // limit>0 なのでページングラッパー側が返る（二形レスポンスの wrapper 側）
  return (Array.isArray(data)
    ? { items: data, total: data.length }
    : data) as PaginatedJobPostingsResponse;
}

export async function fetchPublicJobPosting(
  id: string,
): Promise<JobPosting> {
  const { data, error } = await publicJobPostingsGetPublicJobPosting({
    path: { jobId: id },
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch job posting");
  return data;
}

export async function uploadTeamMemberPhoto(
  file: File,
): Promise<string> {
  const { data, error } = await companyJobPostingsUploadTeamMemberPhoto({
    body: { file },
  });
  if (error || !data) throw new Error("Failed to upload photo");
  return data.url;
}

export async function uploadCoverImage(
  file: File,
): Promise<string> {
  const { data, error } = await companyJobPostingsUploadJobCoverImage({
    body: { file },
  });
  if (error || !data) throw new Error("Failed to upload cover image");
  return data.url;
}

export async function uploadGalleryImage(
  file: File,
): Promise<string> {
  const { data, error } = await companyJobPostingsUploadGalleryImage({
    body: { file },
  });
  if (error || !data) throw new Error("Failed to upload gallery image");
  return data.url;
}
