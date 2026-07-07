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
  type ModelsJobPostingRequest,
  publicJobPostingsGetPublicJobPosting,
  publicJobPostingsListPublicJobPostings,
} from "@/external/client/api/generated";
import { run } from "@/lib/api-result";
import type { JobPosting } from "../scout/types";

export type JobPostingWithCompany = JobPosting & {
  companyName: string;
  companyLogoUrl: string;
};

export type JobPostingBody = ModelsJobPostingRequest;

export async function createJobPosting(body: JobPostingBody): Promise<JobPosting> {
  return run(companyJobPostingsCreateJobPosting({ body }), "Failed to create job posting");
}

export async function fetchJobPostings(): Promise<JobPosting[]> {
  const data = await run(
    companyJobPostingsListCompanyJobPostings({
      cache: "no-store",
    }),
    "Failed to fetch job postings",
  );
  return data.items;
}

export async function fetchJobPosting(id: string): Promise<JobPosting> {
  return run(
    companyJobPostingsGetCompanyJobPosting({
      path: { jobId: id },
      cache: "no-store",
    }),
    "Failed to fetch job posting",
  );
}

export async function updateJobPosting(id: string, body: JobPostingBody): Promise<JobPosting> {
  return run(
    companyJobPostingsUpdateJobPosting({
      path: { jobId: id },
      body,
    }),
    "Failed to update job posting",
  );
}

export async function deleteJobPosting(id: string): Promise<void> {
  await run(
    companyJobPostingsDeleteJobPosting({
      path: { jobId: id },
    }),
    "Failed to delete job posting",
  );
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
  return (await run(
    publicJobPostingsListPublicJobPostings({
      signal,
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
    }),
    "Failed to fetch public job postings",
  )) as PaginatedJobPostingsResponse;
}

export async function fetchPublicJobPosting(id: string): Promise<JobPosting> {
  return run(
    publicJobPostingsGetPublicJobPosting({
      path: { jobId: id },
      cache: "no-store",
    }),
    "Failed to fetch job posting",
  );
}

export async function uploadTeamMemberPhoto(file: File): Promise<string> {
  const data = await run(
    companyJobPostingsUploadTeamMemberPhoto({
      body: { file },
    }),
    "Failed to upload photo",
  );
  return data.url;
}

export async function uploadCoverImage(file: File): Promise<string> {
  const data = await run(
    companyJobPostingsUploadJobCoverImage({
      body: { file },
    }),
    "Failed to upload cover image",
  );
  return data.url;
}

export async function uploadGalleryImage(file: File): Promise<string> {
  const data = await run(
    companyJobPostingsUploadGalleryImage({
      body: { file },
    }),
    "Failed to upload gallery image",
  );
  return data.url;
}
