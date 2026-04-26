import type {
  ScoutDetail,
  ScoutListResponse,
  ScoutCredits,
  QualityScore,
  ScoutMessage,
  ScoutSettings,
  ScoutTemplate,
} from "./types";

const BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8081"
    : "";

// ---------------------------------------------------------------------------
// Company-side
// ---------------------------------------------------------------------------

export async function sendScout(body: {
  candidateId: string;
  jobPostingId?: string;
  subject: string;
  body: string;
}): Promise<ScoutMessage> {
  const res = await fetch(`${BASE_URL}/api/company/scouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to send scout");
  }
  return res.json();
}

export async function fetchCompanyScouts(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ScoutListResponse> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  const res = await fetch(
    `${BASE_URL}/api/company/scouts${qs ? `?${qs}` : ""}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch company scouts");
  return res.json();
}

export async function fetchScoutDetail(
  scoutId: string,
): Promise<ScoutDetail> {
  const res = await fetch(`${BASE_URL}/api/company/scouts/${scoutId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch scout detail");
  return res.json();
}

export async function replyToScoutAsCompany(
  scoutId: string,
  body: string,
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/company/scouts/${scoutId}/reply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to reply to scout");
  }
}

export async function fetchCredits(): Promise<ScoutCredits> {
  const res = await fetch(`${BASE_URL}/api/company/scouts/credits`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch credits");
  return res.json();
}

export async function fetchQualityScore(): Promise<QualityScore> {
  const res = await fetch(`${BASE_URL}/api/company/scouts/quality`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch quality score");
  return res.json();
}

// ---------------------------------------------------------------------------
// Candidate-side
// ---------------------------------------------------------------------------

export async function fetchReceivedScouts(params?: {
  limit?: number;
  offset?: number;
}): Promise<ScoutListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  const res = await fetch(
    `${BASE_URL}/api/scouts${qs ? `?${qs}` : ""}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch received scouts");
  return res.json();
}

export async function fetchReceivedScoutDetail(
  scoutId: string,
): Promise<ScoutDetail> {
  const res = await fetch(`${BASE_URL}/api/scouts/${scoutId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch scout detail");
  return res.json();
}

export async function respondToScout(
  scoutId: string,
  response: "interested" | "declined",
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/scouts/${scoutId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ response }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to respond to scout");
  }
}

export async function replyToScout(
  scoutId: string,
  body: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/scouts/${scoutId}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to reply to scout");
  }
}

export async function bulkDeclineScouts(
  scoutIds: string[],
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/scouts/bulk-decline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ scoutIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to bulk decline scouts");
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function fetchScoutSettings(): Promise<ScoutSettings> {
  const res = await fetch(`${BASE_URL}/api/scout-settings`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch scout settings");
  return res.json();
}

export async function updateScoutSettings(
  acceptingScouts: boolean,
): Promise<ScoutSettings> {
  const res = await fetch(`${BASE_URL}/api/scout-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ acceptingScouts }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to update scout settings");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function fetchTemplates(): Promise<ScoutTemplate[]> {
  const res = await fetch(`${BASE_URL}/api/company/scout-templates`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch templates");
  return res.json();
}

export async function createTemplate(body: {
  name: string;
  subject: string;
  body: string;
}): Promise<ScoutTemplate> {
  const res = await fetch(`${BASE_URL}/api/company/scout-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to create template");
  }
  return res.json();
}

export async function fetchTemplate(id: string): Promise<ScoutTemplate> {
  const res = await fetch(
    `${BASE_URL}/api/company/scout-templates/${id}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch template");
  return res.json();
}

export async function updateTemplate(
  id: string,
  body: { name?: string; subject?: string; body?: string },
): Promise<ScoutTemplate> {
  const res = await fetch(
    `${BASE_URL}/api/company/scout-templates/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to update template");
  }
  return res.json();
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/company/scout-templates/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error("Failed to delete template");
}
