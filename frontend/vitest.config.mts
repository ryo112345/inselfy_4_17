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
  },
});
