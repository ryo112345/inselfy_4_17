import { describe, it, expect } from "vitest";
import { estimateBT } from "./bradley-terry";
import { N } from "./needs";

function emptyWins(): number[][] {
  return Array.from({ length: N }, () => new Array(N).fill(0));
}

describe("estimateBT", () => {
  it("全データなしなら全μが0", () => {
    const result = estimateBT(emptyWins());
    for (const v of result.mu) {
      expect(Math.abs(v)).toBeLessThan(1e-6);
    }
  });

  it("平均ゼロ制約が成り立つ", () => {
    const wins = emptyWins();
    // need 0 が need 1〜5 に全勝
    for (let j = 1; j <= 5; j++) {
      wins[0][j] = 1;
    }
    const result = estimateBT(wins);
    const mean = result.mu.reduce((s, v) => s + v, 0) / N;
    expect(Math.abs(mean)).toBeLessThan(1e-6);
  });

  it("全勝したニーズのμが最大", () => {
    const wins = emptyWins();
    // need 0 が全ニーズに勝利
    for (let j = 1; j < N; j++) {
      wins[0][j] = 1;
    }
    const result = estimateBT(wins);
    const maxMu = Math.max(...result.mu);
    expect(result.mu[0]).toBeCloseTo(maxMu, 5);
    expect(result.mu[0]).toBeGreaterThan(0);
  });

  it("全敗したニーズのμが最小", () => {
    const wins = emptyWins();
    // 全ニーズが need 0 に勝利
    for (let j = 1; j < N; j++) {
      wins[j][0] = 1;
    }
    const result = estimateBT(wins);
    const minMu = Math.min(...result.mu);
    expect(result.mu[0]).toBeCloseTo(minMu, 5);
    expect(result.mu[0]).toBeLessThan(0);
  });

  it("L2正則化により全勝でも発散しない", () => {
    const wins = emptyWins();
    for (let j = 1; j < N; j++) {
      wins[0][j] = 1;
    }
    const result = estimateBT(wins);
    expect(result.mu[0]).toBeLessThan(5);
    expect(result.mu[0]).toBeGreaterThan(1);
  });

  it("対称的な勝敗ならμが対称", () => {
    const wins = emptyWins();
    // need 0 が need 1 に勝ち、need 1 が need 2 に勝ち
    wins[0][1] = 1;
    wins[1][2] = 1;
    wins[0][2] = 1;
    const result = estimateBT(wins);
    // 0 > 1 > 2 の順
    expect(result.mu[0]).toBeGreaterThan(result.mu[1]);
    expect(result.mu[1]).toBeGreaterThan(result.mu[2]);
  });

  it("SEは比較データが多いほど小さくなる", () => {
    const wins1 = emptyWins();
    wins1[0][1] = 1;

    const wins5 = emptyWins();
    for (let j = 1; j <= 5; j++) {
      wins5[0][j] = 1;
      wins5[j + 1 < N ? j + 1 : 1][0] = 0;
    }
    // need 0 に関するデータが多いwins5のほうがSEが小さいはず
    const r1 = estimateBT(wins1);
    const r5 = estimateBT(wins5);
    expect(r5.se[0]).toBeLessThan(r1.se[0]);
  });

  it("完全な推移的順序で整合的な結果が出る", () => {
    const wins = emptyWins();
    // 0 > 1 > 2 > ... > 20 の完全な推移的順序
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        wins[i][j] = 1;
      }
    }
    const result = estimateBT(wins);
    for (let i = 0; i < N - 1; i++) {
      expect(result.mu[i]).toBeGreaterThan(result.mu[i + 1]);
    }
  });
});
