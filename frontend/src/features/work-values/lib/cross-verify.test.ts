import { execSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { estimateBT } from "./bradley-terry";
import { N } from "./needs";

function emptyWins(): number[][] {
  return Array.from({ length: N }, () => new Array(N).fill(0));
}

describe("Cross-verify TS vs Go BT estimation", () => {
  it("transitive order produces matching mu within tolerance", () => {
    const wins = emptyWins();
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        wins[i][j] = 1;
      }
    }

    const tsResult = estimateBT(wins);

    const backendDir = join(process.cwd(), "../backend");
    const output = execSync(
      `cd ${backendDir} && go test ./internal/domain/workvalues/ -run TestEstimateBT_TransitiveOrder -v -json`,
      // CI のコールドキャッシュでは go mod download + コンパイルが走るため余裕を持たせる
      { encoding: "utf-8", timeout: 120_000 },
    ).trim();

    // Go tests pass → same algorithm logic. Now verify numeric output.
    // Use a dedicated Go test that outputs JSON.
    const goTestScript = `
package workvalues

import (
	"encoding/json"
	"fmt"
	"testing"
)

func TestCrossVerifyOutput(t *testing.T) {
	var wins [N][N]int
	for i := 0; i < N; i++ {
		for j := i + 1; j < N; j++ {
			wins[i][j] = 1
		}
	}
	result := EstimateBT(wins)
	b, _ := json.Marshal(map[string]interface{}{"mu": result.Mu, "se": result.SE})
	fmt.Println("CROSS_VERIFY:" + string(b))
}
`;

    const testFile = join(backendDir, "internal/domain/workvalues/cross_verify_test.go");
    writeFileSync(testFile, goTestScript);

    try {
      const testOutput = execSync(
        `cd ${backendDir} && go test ./internal/domain/workvalues/ -run TestCrossVerifyOutput -v`,
        // CI のコールドキャッシュでは go mod download + コンパイルが走るため余裕を持たせる
        { encoding: "utf-8", timeout: 120_000 },
      );

      const line = testOutput.split("\n").find((l) => l.includes("CROSS_VERIFY:"));
      if (!line) throw new Error("No CROSS_VERIFY output found");

      const jsonStr = line.substring(line.indexOf("CROSS_VERIFY:") + "CROSS_VERIFY:".length);
      const goResult = JSON.parse(jsonStr) as { mu: number[]; se: number[] };

      for (let i = 0; i < N; i++) {
        expect(Math.abs(tsResult.mu[i] - goResult.mu[i])).toBeLessThan(1e-3);
        expect(Math.abs(tsResult.se[i] - goResult.se[i])).toBeLessThan(1e-3);
      }
    } finally {
      try {
        unlinkSync(testFile);
      } catch {}
    }
  });
});
