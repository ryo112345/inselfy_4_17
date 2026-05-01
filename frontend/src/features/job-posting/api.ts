import type { JobPosting } from "../scout/types";

export type JobPostingWithCompany = JobPosting & {
  companyName: string;
  companyLogoUrl: string;
};

const BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8081"
    : "";

export type JobPostingBody = {
  title: string;
  description: string;
  employmentType: string;
  location?: string | null;
  status: string;
  jobCategory: string;
  hiringCount: string;
  appealPoints: string;
  challenges: string;
  teamDescription: string;
  teamMembers: { name: string; photoUrl?: string }[];
  teamLabel: string;
  teamId: string | null;
  skillsGained: string;
  tags: string[];
  requiredQualifications: string;
  preferredQualifications: string;
  workLocation: string;
  workLocationChangeScope: string;
  jobDescriptionChangeScope: string;
  contractType: string;
  probationPeriod: string;
  workHours: string;
  breakTime: string;
  holidays: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryDetail: string;
  insurance: string;
  remotePolicy: string;
  benefits: string;
  smokingPolicy: string;
  selectionProcess: string;
  coverImageUrl: string;
  highlightTitleRole: string;
  highlightTitleAppeal: string;
  highlightTitleChallenge: string;
  highlightTitleGrowth: string;
  galleryUrls: string[];
};

export async function createJobPosting(
  body: JobPostingBody,
): Promise<JobPosting> {
  const res = await fetch(`${BASE_URL}/api/company/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to create job posting");
  }
  return res.json();
}

export async function fetchJobPostings(): Promise<JobPosting[]> {
  const res = await fetch(`${BASE_URL}/api/company/jobs`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch job postings");
  return res.json();
}

export async function fetchJobPosting(id: string): Promise<JobPosting> {
  const res = await fetch(`${BASE_URL}/api/company/jobs/${id}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch job posting");
  return res.json();
}

export async function updateJobPosting(
  id: string,
  body: JobPostingBody,
): Promise<JobPosting> {
  const res = await fetch(`${BASE_URL}/api/company/jobs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to update job posting");
  }
  return res.json();
}

export async function deleteJobPosting(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/company/jobs/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete job posting");
}

export async function fetchPublicJobPostings(): Promise<JobPostingWithCompany[]> {
  const res = await fetch(`${BASE_URL}/api/jobs`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch public job postings");
  return res.json();
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
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", params.category);
  if (params.employmentType) query.set("employmentType", params.employmentType);
  if (params.remotePolicy) query.set("remotePolicy", params.remotePolicy);
  if (params.sort) query.set("sort", params.sort);
  if (params.valueFilters) query.set("valueFilters", params.valueFilters);
  if (params.filterMode) query.set("filterMode", params.filterMode);
  query.set("limit", String(params.limit ?? 20));
  query.set("offset", String(params.offset ?? 0));

  const res = await fetch(`${BASE_URL}/api/jobs?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch public job postings");
  return res.json();
}

export async function fetchPublicJobPosting(
  id: string,
): Promise<JobPosting> {
  const res = await fetch(`${BASE_URL}/api/jobs/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch job posting");
  return res.json();
}

export async function uploadTeamMemberPhoto(
  file: File,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/api/company/jobs/team-member-photo`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload photo");
  const data = await res.json();
  return data.url;
}

export async function uploadCoverImage(
  file: File,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/api/company/jobs/cover-image`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload cover image");
  const data = await res.json();
  return data.url;
}

export async function uploadGalleryImage(
  file: File,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/api/company/jobs/gallery-image`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload gallery image");
  const data = await res.json();
  return data.url;
}
