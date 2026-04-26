import type { JobPosting } from "../scout/types";

const BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8081"
    : "";

export async function createJobPosting(body: {
  title: string;
  description: string;
  employmentType: string;
  location?: string;
}): Promise<JobPosting> {
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
  });
  if (!res.ok) throw new Error("Failed to fetch job postings");
  return res.json();
}

export async function fetchJobPosting(id: string): Promise<JobPosting> {
  const res = await fetch(`${BASE_URL}/api/company/jobs/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch job posting");
  return res.json();
}

export async function updateJobPosting(
  id: string,
  body: {
    title?: string;
    description?: string;
    employmentType?: string;
    location?: string;
  },
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
