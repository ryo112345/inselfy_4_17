import { defineConfig } from "vitest/config";

// e2e/ は Playwright 管轄なので vitest の対象から外す（CI では別ジョブで扱う）。
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
