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
import { run } from "@/lib/api-result";
import type {
  QualityScore,
  ScoutCredits,
  ScoutDashboard,
  ScoutDetail,
  ScoutListResponse,
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
  return (await run(companyScoutsSendScout({ body }), "Failed to send scout")) as ScoutMessage;
}

export async function fetchCompanyScouts(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ScoutListResponse> {
  return (await run(
    companyScoutsListCompanyScouts({
      query: {
        status: params?.status || undefined,
        limit: params?.limit ?? undefined,
        offset: params?.offset ?? undefined,
      },
      cache: "no-store",
    }),
    "Failed to fetch company scouts",
  )) as ScoutListResponse;
}

export async function fetchScoutDetail(scoutId: string): Promise<ScoutDetail> {
  return (await run(
    companyScoutsGetCompanyScoutDetail({
      path: { scoutId },
      cache: "no-store",
    }),
    "Failed to fetch scout detail",
  )) as ScoutDetail;
}

export async function replyToScoutAsCompany(scoutId: string, body: string): Promise<void> {
  await run(
    companyScoutsCompanyScoutReply({
      path: { scoutId },
      body: { body },
    }),
    "Failed to reply to scout",
  );
}

export async function fetchScoutDashboard(): Promise<ScoutDashboard> {
  return run(
    companyScoutsGetScoutDashboard({
      cache: "no-store",
    }),
    "Failed to fetch scout dashboard",
  );
}

export async function fetchCredits(): Promise<ScoutCredits> {
  return run(
    companyScoutsGetScoutCredits({
      cache: "no-store",
    }),
    "Failed to fetch credits",
  );
}

export async function fetchQualityScore(): Promise<QualityScore> {
  return (await run(
    companyScoutsGetScoutQuality({
      cache: "no-store",
    }),
    "Failed to fetch quality score",
  )) as QualityScore;
}

// ---------------------------------------------------------------------------
// Candidate-side
// ---------------------------------------------------------------------------

export async function fetchReceivedScouts(params?: {
  limit?: number;
  offset?: number;
}): Promise<ScoutListResponse> {
  return (await run(
    candidateScoutsListCandidateScouts({
      query: {
        limit: params?.limit ?? undefined,
        offset: params?.offset ?? undefined,
      },
      cache: "no-store",
    }),
    "Failed to fetch received scouts",
  )) as ScoutListResponse;
}

export async function fetchReceivedScoutDetail(scoutId: string): Promise<ScoutDetail> {
  return (await run(
    candidateScoutsGetCandidateScoutDetail({
      path: { scoutId },
      cache: "no-store",
    }),
    "Failed to fetch scout detail",
  )) as ScoutDetail;
}

export async function respondToScout(
  scoutId: string,
  response: "interested" | "declined",
): Promise<{ conversationId?: string }> {
  return run(
    candidateScoutsRespondToScout({
      path: { scoutId },
      body: { response },
    }),
    "Failed to respond to scout",
  );
}

export async function replyToScout(scoutId: string, body: string): Promise<void> {
  await run(
    candidateScoutsCandidateScoutReply({
      path: { scoutId },
      body: { body },
    }),
    "Failed to reply to scout",
  );
}

export async function bulkDeclineScouts(scoutIds: string[]): Promise<void> {
  await run(
    candidateScoutsBulkDeclineScouts({
      body: { scoutIds },
    }),
    "Failed to bulk decline scouts",
  );
}

export async function bulkRespondScouts(
  scoutIds: string[],
  response: "interested" | "declined",
): Promise<void> {
  await run(
    candidateScoutsBulkRespondScouts({
      body: { scoutIds, response },
    }),
    "Failed to bulk respond to scouts",
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function fetchScoutSettings(): Promise<ScoutSettings> {
  return run(
    scoutSettingsGetScoutSettings({
      cache: "no-store",
    }),
    "Failed to fetch scout settings",
  );
}

export async function updateScoutSettings(acceptingScouts: boolean): Promise<ScoutSettings> {
  return run(
    scoutSettingsUpdateScoutSettings({
      body: { acceptingScouts },
    }),
    "Failed to update scout settings",
  );
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function fetchTemplates(): Promise<ScoutTemplate[]> {
  const data = await run(
    scoutTemplatesListScoutTemplates({
      cache: "no-store",
    }),
    "Failed to fetch templates",
  );
  return data.items;
}

export async function createTemplate(body: {
  name: string;
  subject: string;
  body: string;
}): Promise<ScoutTemplate> {
  return run(scoutTemplatesCreateScoutTemplate({ body }), "Failed to create template");
}

export async function fetchTemplate(id: string): Promise<ScoutTemplate> {
  return run(
    scoutTemplatesGetScoutTemplate({
      path: { templateId: id },
      cache: "no-store",
    }),
    "Failed to fetch template",
  );
}

export async function updateTemplate(
  id: string,
  body: { name: string; subject: string; body: string },
): Promise<ScoutTemplate> {
  return run(
    scoutTemplatesUpdateScoutTemplate({
      path: { templateId: id },
      body,
    }),
    "Failed to update template",
  );
}

export async function deleteTemplate(id: string): Promise<void> {
  await run(
    scoutTemplatesDeleteScoutTemplate({
      path: { templateId: id },
    }),
    "Failed to delete template",
  );
}
