import { expect, test } from "@playwright/test";
import {
  bypassLoginCompany,
  bypassLoginUser,
  ensureApplication,
  futureSlot,
  INSELFY_COMPANY_ID,
  JOB_POSTING_FOR_PROPOSAL_CANCEL_SPEC,
  proposeInterview,
  RINA_TAKAHASHI_USER_ID,
} from "./helpers";

test("candidate sees cancelled proposal in real-time when company re-proposes", async ({
  browser,
}) => {
  // --- Setup: 候補者の応募を保証し、企業セッションを用意する ---
  const candidateCtx = await browser.newContext();
  const candidatePage = await candidateCtx.newPage();
  await bypassLoginUser(candidatePage.request, RINA_TAKAHASHI_USER_ID);
  const applicationId = await ensureApplication(
    candidatePage.request,
    JOB_POSTING_FOR_PROPOSAL_CANCEL_SPEC,
  );

  const companyCtx = await browser.newContext();
  const companyPage = await companyCtx.newPage();
  await bypassLoginCompany(companyPage.request, INSELFY_COMPANY_ID);

  // --- Step 1: Company sends first proposal ---
  await proposeInterview(companyPage.request, applicationId, "リアルタイム確認用の提案", [
    futureSlot(2),
  ]);

  // --- Step 2: Candidate opens messages page and sees the proposal ---
  await candidatePage.goto("/messages");
  await candidatePage.waitForLoadState("networkidle");

  const convItem = candidatePage.locator("button", { hasText: "inselfy" }).first();
  await expect(convItem).toBeVisible({ timeout: 10000 });
  await convItem.click();
  await candidatePage.waitForTimeout(2000);

  // Scroll to bottom to see latest proposal
  const messageContainer = candidatePage.locator("[class*='overflow-y-auto']").last();
  await messageContainer.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await candidatePage.waitForTimeout(1000);

  // Verify the active proposal is visible (calendar with selectable slots)
  const selectHint = candidatePage.getByText("カレンダーをクリックして選択");
  await expect(selectHint.last()).toBeVisible({ timeout: 5000 });

  // --- Step 3: While candidate page is open, company sends re-proposal ---
  await proposeInterview(companyPage.request, applicationId, "再提案テスト", [futureSlot(3)]);

  // --- Step 4: Wait for polling to detect cancellation (max ~15s) ---
  const cancelledText = candidatePage.getByText("この提案は取り消されました");
  await expect(cancelledText.first()).toBeVisible({ timeout: 20000 });

  await companyCtx.close();
  await candidateCtx.close();
});
