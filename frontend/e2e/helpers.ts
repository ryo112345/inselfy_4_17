import { type APIRequestContext, expect } from "@playwright/test";

// 開発シードの固定データ（backend/scripts/seed.sql 由来）
export const INSELFY_COMPANY_ID = "afd20f1c-b6a8-4809-bc8f-b3f41263b511";
export const RINA_TAKAHASHI_USER_ID = "10000000-0000-0000-0000-000000000021"; // 高橋里奈

// メッセージ系スペックは同一会話（rina ↔ inselfy）を共有するが、
// 提案の再提案は同一応募の既存提案を自動キャンセルするため、
// スペックごとに別の求人へ応募して応募単位で分離する（並列実行での干渉を防ぐ）
export const JOB_POSTING_FOR_CALENDAR_SPEC = "b0000000-0000-0000-0000-000000000002";
export const JOB_POSTING_FOR_PROPOSAL_CANCEL_SPEC = "b0000000-0000-0000-0000-000000000003";
export const JOB_POSTING_FOR_MESSAGES_SPEC = "b0000000-0000-0000-0000-000000000004";

const BASE = "http://localhost:3000";

// admin API は fail-closed（X-Admin-Key 必須）。キーは playwright.config.ts が
// リポジトリルートの .env から process.env.ADMIN_API_KEY に読み込む
function adminHeaders() {
  return { "X-Admin-Key": process.env.ADMIN_API_KEY ?? "" };
}

/** 管理APIのバイパスログインで候補者セッション cookie を context に付与する */
export async function bypassLoginUser(request: APIRequestContext, userId: string) {
  const res = await request.post(`${BASE}/api/admin/users/${userId}/bypass-login`, {
    headers: adminHeaders(),
  });
  expect(res.ok(), "ユーザー bypass-login に失敗（ADMIN_API_KEY 未設定の可能性）").toBeTruthy();
}

/** 管理APIのバイパスログインで企業セッション cookie を context に付与する */
export async function bypassLoginCompany(request: APIRequestContext, companyId: string) {
  const res = await request.post(`${BASE}/api/admin/companies/${companyId}/bypass-login`, {
    headers: adminHeaders(),
  });
  expect(res.ok(), "企業 bypass-login に失敗（ADMIN_API_KEY 未設定の可能性）").toBeTruthy();
}

/** 候補者（認証済み request）が指定求人に応募済みであることを保証し、応募IDを返す */
export async function ensureApplication(
  candidateRequest: APIRequestContext,
  jobPostingId: string,
): Promise<string> {
  const list = await candidateRequest.get(`${BASE}/api/applications`);
  expect(list.ok()).toBeTruthy();
  const items: { id: string; jobPostingId: string; status: string }[] =
    (await list.json()).items ?? [];
  const existing = items.find((a) => a.jobPostingId === jobPostingId);
  if (existing) return existing.id;

  const res = await candidateRequest.post(`${BASE}/api/applications`, {
    data: { jobPostingId, message: "e2e セットアップ用の応募" },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).id;
}

/** N日後の startHour:00〜endHour:00 の面接候補枠 */
export function futureSlot(daysFromNow: number, startHour = 10, endHour = 12) {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(endHour, 0, 0, 0);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

/** 企業（認証済み request）が面接日程を提案する。同一応募の既存提案は自動キャンセルされる */
export async function proposeInterview(
  companyRequest: APIRequestContext,
  applicationId: string,
  message: string,
  slots: { startTime: string; endTime: string }[],
) {
  const res = await companyRequest.post(`${BASE}/api/company/interviews/propose`, {
    data: {
      applicationId,
      message,
      location: "オンライン",
      durationMinutes: 60,
      expiresInDays: 7,
      slots,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res;
}
