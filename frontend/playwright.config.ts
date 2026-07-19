import fs from "node:fs";
import path from "node:path";
import { defineConfig, type ReporterDescription } from "@playwright/test";

// admin bypass-login 用の ADMIN_API_KEY をリポジトリルートの .env から読み込む
// （admin API は fail-closed のため、キー無しでは bypass-login が 401 になる）
if (!process.env.ADMIN_API_KEY) {
  try {
    const env = fs.readFileSync(path.resolve(__dirname, "../.env"), "utf-8");
    const m = env.match(/^ADMIN_API_KEY=(.+)$/m);
    if (m) process.env.ADMIN_API_KEY = m[1].trim();
  } catch {
    // .env が無い環境では環境変数で渡す
  }
}

// CI（frontend-e2e.yml）では compose の e2e スタック（:18080）に向ける。
// ローカルは従来どおり dev サーバ（:3000）＋リトライ無し・trace 無し
const CI = !!process.env.CI;
const ciReporters: ReporterDescription[] = [["list"], ["html", { open: "never" }]];

export default defineConfig({
  testDir: "./e2e",
  retries: CI ? 2 : 0,
  reporter: CI ? ciReporters : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: CI ? "retain-on-failure" : "off",
  },
});
