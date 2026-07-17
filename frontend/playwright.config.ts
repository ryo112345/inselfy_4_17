import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";

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

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3000",
  },
});
