const BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8081"
    : "";

export type JobApplication = {
  id: string;
  jobPostingId: string;
  candidateId: string;
  companyId: string;
  status: string;
  message: string;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  candidateAvatar: string;
  candidateUsername: string;
  candidateHeadline: string;
  createdAt: string;
  updatedAt: string;
};

export type JobApplicationListResponse = {
  items: JobApplication[];
  total: number;
};

export async function applyToJob(
  jobPostingId: string,
  message?: string,
): Promise<JobApplication> {
  const res = await fetch(`${BASE_URL}/api/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ jobPostingId, message: message ?? "" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "応募に失敗しました");
  }
  return res.json();
}

export async function checkApplied(jobPostingId: string): Promise<boolean> {
  const res = await fetch(
    `${BASE_URL}/api/applications/check?jobPostingId=${jobPostingId}`,
    { credentials: "include" },
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data.applied;
}

export async function fetchCandidateApplications(): Promise<JobApplicationListResponse> {
  const res = await fetch(`${BASE_URL}/api/applications`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch applications");
  return res.json();
}

export async function withdrawApplication(
  applicationId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/withdraw`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error("Failed to withdraw application");
}

export async function fetchCompanyApplications(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<JobApplicationListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  query.set("limit", String(params?.limit ?? 50));
  query.set("offset", String(params?.offset ?? 0));
  const res = await fetch(
    `${BASE_URL}/api/company/applications?${query}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Failed to fetch applications");
  return res.json();
}

export async function updateApplicationStatus(
  applicationId: string,
  status: string,
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/company/applications/${applicationId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) throw new Error("Failed to update status");
}
