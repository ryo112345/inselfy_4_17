import { expect, test } from "@playwright/test";
import {
  bypassLoginCompany,
  bypassLoginUser,
  ensureApplication,
  futureSlot,
  INSELFY_COMPANY_ID,
  JOB_POSTING_FOR_MESSAGES_SPEC,
  proposeInterview,
  RINA_TAKAHASHI_USER_ID,
} from "./helpers";

// 旧: 手動確認用のスクロールデモ（page.pause() で停止していた）。
// 会話を自前で用意し、スレッドが開いてスクロールできることを検証するスモークに変更。
test("messages: conversation opens and thread scrolls", async ({ page, playwright }) => {
  // --- Setup: 応募＋面接提案で rina ↔ inselfy の会話（メッセージ）を保証する ---
  await bypassLoginUser(page.request, RINA_TAKAHASHI_USER_ID);
  const applicationId = await ensureApplication(page.request, JOB_POSTING_FOR_MESSAGES_SPEC);

  const companyRequest = await playwright.request.newContext();
  await bypassLoginCompany(companyRequest, INSELFY_COMPANY_ID);
  await proposeInterview(companyRequest, applicationId, "スクロール検証用の提案", [futureSlot(2)]);
  await companyRequest.dispose();

  await page.goto("/messages");
  await page.waitForLoadState("networkidle");

  // Click the conversation
  const convItem = page.locator("button", { hasText: "inselfy" }).first();
  await expect(convItem).toBeVisible({ timeout: 10000 });
  await convItem.click();
  await page.waitForTimeout(1500);

  // メッセージスレッドが表示され、末尾までスクロールできる
  const thread = page.locator("[class*='overflow-y-auto']").last();
  await expect(thread).toBeVisible();
  await thread.evaluate((el) => el.scrollTo(0, el.scrollHeight));

  // セットアップで作成した提案カードが描画されている
  await expect(page.getByText("カレンダーをクリックして選択").last()).toBeVisible({
    timeout: 5000,
  });
});
