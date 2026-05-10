import { test, expect } from "@playwright/test";

const USER_ID = "10000000-0000-0000-0000-000000000021"; // 高橋里奈
const COMPANY_ID = "b0000000-0000-0000-0000-000000000001";
const APPLICATION_ID = "e20c7599-35b0-4e06-b809-17c8c4f2dbe7";

function futureSlot(daysFromNow: number) {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12, 0, 0, 0);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

test("candidate sees cancelled proposal in real-time when company re-proposes", async ({
  browser,
}) => {
  // --- Step 1: Company sends first proposal ---
  const companyCtx = await browser.newContext();
  const companyPage = await companyCtx.newPage();

  await companyPage.request.post(
    `http://localhost:3000/api/admin/companies/${COMPANY_ID}/bypass-login`,
  );

  const firstProposal = await companyPage.request.post(
    "http://localhost:3000/api/company/interviews/propose",
    {
      data: {
        applicationId: APPLICATION_ID,
        message: "リアルタイム確認用の提案",
        durationMinutes: 60,
        slots: [futureSlot(2)],
      },
    },
  );
  expect(firstProposal.ok()).toBeTruthy();

  // --- Step 2: Candidate opens messages page and sees the proposal ---
  const candidateCtx = await browser.newContext();
  const candidatePage = await candidateCtx.newPage();

  await candidatePage.request.post(
    `http://localhost:3000/api/admin/users/${USER_ID}/bypass-login`,
  );

  await candidatePage.goto("/messages");
  await candidatePage.waitForLoadState("networkidle");

  const convItem = candidatePage.getByText("クラウドソル株式会社").first();
  await expect(convItem).toBeVisible({ timeout: 10000 });
  await convItem.click();
  await candidatePage.waitForTimeout(2000);

  // Scroll to bottom to see latest proposal
  const messageContainer = candidatePage
    .locator("[class*='overflow-y-auto']")
    .last();
  await messageContainer.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await candidatePage.waitForTimeout(1000);

  // Verify the active proposal is visible (calendar with selectable slots)
  const selectHint = candidatePage.getByText("カレンダーをクリックして選択");
  await expect(selectHint.last()).toBeVisible({ timeout: 5000 });

  // --- Step 3: While candidate page is open, company sends re-proposal ---
  const secondProposal = await companyPage.request.post(
    "http://localhost:3000/api/company/interviews/propose",
    {
      data: {
        applicationId: APPLICATION_ID,
        message: "再提案テスト",
        durationMinutes: 60,
        slots: [futureSlot(3)],
      },
    },
  );
  expect(secondProposal.ok()).toBeTruthy();

  // --- Step 4: Wait for polling to detect cancellation (max ~15s) ---
  const cancelledText = candidatePage.getByText("この提案は取り消されました");
  await expect(cancelledText.first()).toBeVisible({ timeout: 20000 });

  await candidatePage.screenshot({
    path: "/tmp/proposal-realtime-cancel.png",
    fullPage: true,
  });

  console.log("Realtime cancellation display verified successfully");

  await companyCtx.close();
  await candidateCtx.close();
});
