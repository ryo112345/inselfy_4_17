import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// e2e/ は Playwright 管轄なので vitest の対象から外す（CI では別ジョブで扱う）。
export default defineConfig({
  resolve: {
    // tsconfig の paths（"@/*" → "./src/*"）と揃える
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      // lcov は octocov（CI の PR コメント）用、text はローカル実行時の一覧表示用
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      // 生成コード（orval）はカバレッジの分母から除外（backend の .octocov.yml と同方針）
      exclude: ["src/external/client/api/orval/generated/**", "src/**/*.test.{ts,tsx}"],
    },
  },
});
