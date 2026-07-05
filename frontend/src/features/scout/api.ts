import "@/external/client/api/client";
import {
  candidateScoutsBulkDeclineScouts,
  candidateScoutsBulkRespondScouts,
  candidateScoutsCandidateScoutReply,
  candidateScoutsGetCandidateScoutDetail,
  candidateScoutsListCandidateScouts,
  candidateScoutsRespondToScout,
  companyScoutsCompanyScoutReply,
  companyScoutsGetCompanyScoutDetail,
  companyScoutsGetScoutCredits,
  companyScoutsGetScoutDashboard,
  companyScoutsGetScoutQuality,
  companyScoutsListCompanyScouts,
  companyScoutsSendScout,
  scoutSettingsGetScoutSettings,
  scoutSettingsUpdateScoutSettings,
  scoutTemplatesCreateScoutTemplate,
  scoutTemplatesDeleteScoutTemplate,
  scoutTemplatesGetScoutTemplate,
  scoutTemplatesListScoutTemplates,
  scoutTemplatesUpdateScoutTemplate,
} from "@/external/client/api/generated";
import type {
  ScoutDashboard,
  ScoutDetail,
  ScoutListResponse,
  ScoutCredits,
  QualityScore,
  ScoutMessage,
  ScoutSettings,
  ScoutTemplate,
} from "./types";

// ---------------------------------------------------------------------------
// Company-side
// ---------------------------------------------------------------------------

export async function sendScout(body: {
  candidateId: string;
  jobPostingId?: string;
  subject: string;
  body: string;
}): Promise<ScoutMessage> {
  const { data, error } = await companyScoutsSendScout({ body });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to send scout");
  }
  return data as ScoutMessage;
}

export async function fetchCompanyScouts(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ScoutListResponse> {
  const { data, error } = await companyScoutsListCompanyScouts({
    query: {
      status: params?.status || undefined,
      limit: params?.limit ?? undefined,
      offset: params?.offset ?? undefined,
    },
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch company scouts");
  return data as ScoutListResponse;
}

export async function fetchScoutDetail(
  scoutId: string,
): Promise<ScoutDetail> {
  const { data, error } = await companyScoutsGetCompanyScoutDetail({
    path: { scoutId },
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch scout detail");
  return data as ScoutDetail;
}

export async function replyToScoutAsCompany(
  scoutId: string,
  body: string,
): Promise<void> {
  const { error } = await companyScoutsCompanyScoutReply({
    path: { scoutId },
    body: { body },
  });
  if (error) {
    throw new Error(error.message ?? "Failed to reply to scout");
  }
}

export async function fetchScoutDashboard(): Promise<ScoutDashboard> {
  const { data, error } = await companyScoutsGetScoutDashboard({
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch scout dashboard");
  return data;
}

export async function fetchCredits(): Promise<ScoutCredits> {
  const { data, error } = await companyScoutsGetScoutCredits({
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch credits");
  return data;
}

export async function fetchQualityScore(): Promise<QualityScore> {
  const { data, error } = await companyScoutsGetScoutQuality({
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch quality score");
  return data as QualityScore;
}

// ---------------------------------------------------------------------------
// Candidate-side
// ---------------------------------------------------------------------------

export async function fetchReceivedScouts(params?: {
  limit?: number;
  offset?: number;
}): Promise<ScoutListResponse> {
  const { data, error } = await candidateScoutsListCandidateScouts({
    query: {
      limit: params?.limit ?? undefined,
      offset: params?.offset ?? undefined,
    },
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch received scouts");
  return data as ScoutListResponse;
}

export async function fetchReceivedScoutDetail(
  scoutId: string,
): Promise<ScoutDetail> {
  const { data, error } = await candidateScoutsGetCandidateScoutDetail({
    path: { scoutId },
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch scout detail");
  return data as ScoutDetail;
}

export async function respondToScout(
  scoutId: string,
  response: "interested" | "declined",
): Promise<{ conversationId?: string }> {
  const { data, error } = await candidateScoutsRespondToScout({
    path: { scoutId },
    body: { response },
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to respond to scout");
  }
  return data;
}

export async function replyToScout(
  scoutId: string,
  body: string,
): Promise<void> {
  const { error } = await candidateScoutsCandidateScoutReply({
    path: { scoutId },
    body: { body },
  });
  if (error) {
    throw new Error(error.message ?? "Failed to reply to scout");
  }
}

export async function bulkDeclineScouts(
  scoutIds: string[],
): Promise<void> {
  const { error } = await candidateScoutsBulkDeclineScouts({
    body: { scoutIds },
  });
  if (error) {
    throw new Error(error.message ?? "Failed to bulk decline scouts");
  }
}

export async function bulkRespondScouts(
  scoutIds: string[],
  response: "interested" | "declined",
): Promise<void> {
  const { error } = await candidateScoutsBulkRespondScouts({
    body: { scoutIds, response },
  });
  if (error) {
    throw new Error(error.message ?? "Failed to bulk respond to scouts");
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function fetchScoutSettings(): Promise<ScoutSettings> {
  const { data, error } = await scoutSettingsGetScoutSettings({
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch scout settings");
  return data;
}

export async function updateScoutSettings(
  acceptingScouts: boolean,
): Promise<ScoutSettings> {
  const { data, error } = await scoutSettingsUpdateScoutSettings({
    body: { acceptingScouts },
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update scout settings");
  }
  return data;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function fetchTemplates(): Promise<ScoutTemplate[]> {
  const { data, error } = await scoutTemplatesListScoutTemplates({
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch templates");
  return data;
}

export async function createTemplate(body: {
  name: string;
  subject: string;
  body: string;
}): Promise<ScoutTemplate> {
  const { data, error } = await scoutTemplatesCreateScoutTemplate({ body });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create template");
  }
  return data;
}

export async function fetchTemplate(id: string): Promise<ScoutTemplate> {
  const { data, error } = await scoutTemplatesGetScoutTemplate({
    path: { templateId: id },
    cache: "no-store",
  });
  if (error || !data) throw new Error("Failed to fetch template");
  return data;
}

export async function updateTemplate(
  id: string,
  body: { name: string; subject: string; body: string },
): Promise<ScoutTemplate> {
  const { data, error } = await scoutTemplatesUpdateScoutTemplate({
    path: { templateId: id },
    body,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update template");
  }
  return data;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await scoutTemplatesDeleteScoutTemplate({
    path: { templateId: id },
  });
  if (error) throw new Error("Failed to delete template");
}
