import { test, expect } from "@playwright/test";

test("profile → integrated-report → back → forward shows report content", async ({
  page,
}) => {
  // Inject diagnostic logging
  await page.addInitScript(() => {
    (window as any).__navLog = [];
    window.addEventListener("pageshow", (e) => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      (window as any).__navLog.push({
        event: "pageshow",
        persisted: e.persisted,
        navType: nav?.type,
        url: location.href,
        time: Date.now(),
      });
    });
  });

  // Log API requests
  const apiLogs: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/")) {
      apiLogs.push(`REQ  ${req.method()} ${req.url()}`);
    }
  });
  page.on("response", (res) => {
    if (res.url().includes("/api/")) {
      apiLogs.push(`RES  ${res.status()} ${res.url()}`);
    }
  });

  // 1. Go to profile page
  await page.goto("/profile/user_07fb61d3");
  await page.waitForLoadState("networkidle");

  // 2. Navigate to integrated report page
  await page.goto(
    "/integrated-report/9228c21c-c2b5-4847-a81c-4e0f177b1a06",
  );
  await page.waitForLoadState("networkidle");
  apiLogs.length = 0;

  // 3. Browser back
  await page.goBack();
  await page.waitForTimeout(3000);
  let navLog = await page.evaluate(() => (window as any).__navLog);
  console.log("=== After back navLog ===", JSON.stringify(navLog, null, 2));
  console.log("=== After back API ===", apiLogs);
  apiLogs.length = 0;

  // 4. Browser forward
  await page.goForward();
  await page.waitForTimeout(5000);
  navLog = await page.evaluate(() => (window as any).__navLog);
  console.log("=== After forward navLog ===", JSON.stringify(navLog, null, 2));
  console.log("=== After forward API ===", apiLogs);

  const spinnerCount = await page.locator(".animate-spin").count();
  console.log(`Spinner count: ${spinnerCount}`);

  // Check if useEffect ran
  const effectRan = await page.evaluate(() => {
    // Check if there are any pending fetches or if React hydrated
    return document.querySelectorAll(".animate-spin").length;
  });
  console.log(`Spinners in DOM: ${effectRan}`);

  await expect(page.locator(".animate-spin")).toHaveCount(0, { timeout: 3000 });
});
