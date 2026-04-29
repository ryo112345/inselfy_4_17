import type { JobPosting } from "../scout/types";

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
