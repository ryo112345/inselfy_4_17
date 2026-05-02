import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const API = "http://localhost:8081";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "";

// Company: クラウドソル株式会社 田中裕子
const COMPANY_ID = "b0000000-0000-0000-0000-000000000001";
// Candidate: 三浦沙織 (tm_c02010000004)
const CANDIDATE_ID = "c0201000-0000-0001-0000-000000000004";

async function main() {
  const browser = await chromium.launch({ headless: false });

  // --- Tab 1: Company ---
  const companyCtx = await browser.newContext();
  const companyPage = await companyCtx.newPage();

  // Bypass login as company
  console.log("[company] bypass login...");
  const companyLoginRes = await companyPage.request.post(
    `${BASE}/api/admin/companies/${COMPANY_ID}/bypass-login`,
    { headers: { "X-Admin-Key": ADMIN_KEY } }
  );
  console.log("[company] login status:", companyLoginRes.status());

  await companyPage.goto(`${BASE}/company/messages`);
  await companyPage.waitForLoadState("networkidle");
  console.log("[company] messages page loaded");

  // Click on the conversation with 三浦沙織
  const convItem = companyPage.locator("text=三浦沙織").first();
  if (await convItem.isVisible()) {
    await convItem.click();
    await companyPage.waitForTimeout(1000);
    console.log("[company] selected conversation with 三浦沙織");
  } else {
    console.log("[company] conversation not found");
  }

  // Count current messages on company side
  const companyMsgsBefore = await companyPage.locator('[class*="whitespace-pre-wrap"]').count();
  console.log("[company] messages before:", companyMsgsBefore);

  // --- Tab 2: Candidate ---
  const candidateCtx = await browser.newContext();
  const candidatePage = await candidateCtx.newPage();

  // Bypass login as candidate
  console.log("[candidate] bypass login...");
  const candidateLoginRes = await candidatePage.request.post(
    `${BASE}/api/admin/users/${CANDIDATE_ID}/bypass-login`,
    { headers: { "X-Admin-Key": ADMIN_KEY } }
  );
  console.log("[candidate] login status:", candidateLoginRes.status());

  await candidatePage.goto(`${BASE}/messages`);
  await candidatePage.waitForLoadState("networkidle");
  console.log("[candidate] messages page loaded");

  // Click on conversation with クラウドソル
  const candConvItem = candidatePage.locator("text=クラウドソル").first();
  if (await candConvItem.isVisible()) {
    await candConvItem.click();
    await candidatePage.waitForTimeout(1000);
    console.log("[candidate] selected conversation");
  }

  // --- Check WebSocket connections ---
  console.log("\n--- Checking WebSocket status ---");

  // Check company side WS ticket
  const companyTicketRes = await companyPage.evaluate(async () => {
    try {
      const res = await fetch("/api/ws/ticket?type=company", { credentials: "include" });
      return { status: res.status, body: await res.text() };
    } catch (e: any) {
      return { status: -1, body: e.message };
    }
  });
  console.log("[company] ws ticket:", companyTicketRes);

  // Check candidate side WS ticket
  const candidateTicketRes = await candidatePage.evaluate(async () => {
    try {
      const res = await fetch("/api/ws/ticket?type=candidate", { credentials: "include" });
      return { status: res.status, body: await res.text() };
    } catch (e: any) {
      return { status: -1, body: e.message };
    }
  });
  console.log("[candidate] ws ticket:", candidateTicketRes);

  // Wait a moment for WS to connect
  await companyPage.waitForTimeout(3000);

  // --- Send message from candidate ---
  const testMsg = `テスト ${Date.now()}`;
  console.log(`\n[candidate] sending: "${testMsg}"`);

  const textarea = candidatePage.locator('textarea[placeholder="メッセージを入力..."]');
  await textarea.fill(testMsg);
  const sendBtn = candidatePage.locator("button").filter({ has: candidatePage.locator("svg") }).last();
  await sendBtn.click();
  console.log("[candidate] message sent");

  // --- Wait and check if company side received it ---
  console.log("[company] waiting for real-time update...");
  await companyPage.waitForTimeout(5000);

  const companyMsgsAfter = await companyPage.locator('[class*="whitespace-pre-wrap"]').count();
  console.log("[company] messages after:", companyMsgsAfter);

  // Check if the test message appears on company side
  const hasNewMsg = await companyPage.locator(`text=${testMsg}`).isVisible().catch(() => false);
  console.log("[company] received message without reload?", hasNewMsg);

  if (!hasNewMsg) {
    console.log("\n--- Debugging: checking console errors ---");

    // Check company page console for WS errors
    companyPage.on("console", (msg) => {
      if (msg.type() === "error" || msg.text().includes("ws") || msg.text().includes("WebSocket")) {
        console.log("[company console]", msg.text());
      }
    });

    // Reload and check
    console.log("[company] reloading to verify message exists in DB...");
    await companyPage.reload();
    await companyPage.waitForLoadState("networkidle");
    await convItem.click();
    await companyPage.waitForTimeout(2000);
    const afterReload = await companyPage.locator(`text=${testMsg}`).isVisible().catch(() => false);
    console.log("[company] message visible after reload?", afterReload);
  }

  console.log("\n--- Test complete. Browser stays open for inspection. Press Ctrl+C to close. ---");
  await new Promise(() => {}); // keep open
}

main().catch(console.error);
