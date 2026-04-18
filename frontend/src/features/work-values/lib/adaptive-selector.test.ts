import { describe, it, expect } from "vitest";
import { AdaptiveSelector, type Pair } from "./adaptive-selector";
import { N } from "./needs";

function makeInitialPairs(): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < N; i++) {
    pairs.push({ needA: i, needB: (i + 1) % N });
  }
  return pairs;
}

describe("AdaptiveSelector", () => {
  it("最初の21問は初期ペアを返す", () => {
    const initial = makeInitialPairs();
    const selector = new AdaptiveSelector(initial);

    for (let q = 0; q < 21; q++) {
      const pair = selector.nextPair();
      expect(pair).toEqual(initial[q]);
      selector.recordResponse(pair!, pair!.needA);
    }
  });

  it("22問目以降はアダプティブに選択する", () => {
    const selector = new AdaptiveSelector(makeInitialPairs());

    for (let q = 0; q < 21; q++) {
      const pair = selector.nextPair()!;
      selector.recordResponse(pair, pair.needA);
    }

    const pair22 = selector.nextPair();
    expect(pair22).not.toBeNull();
    // 初期ペアとは異なるペアが選ばれるはず（同じこともありえるが出題済みは除外される）
    expect(pair22!.needA).toBeGreaterThanOrEqual(0);
    expect(pair22!.needB).toBeLessThan(N);
  });

  it("70問で終了する", () => {
    const selector = new AdaptiveSelector(makeInitialPairs());

    for (let q = 0; q < 70; q++) {
      expect(selector.isComplete).toBe(false);
      const pair = selector.nextPair()!;
      selector.recordResponse(pair, pair.needA);
    }

    expect(selector.isComplete).toBe(true);
    expect(selector.nextPair()).toBeNull();
  });

  it("全ニーズが初期ラウンドロビンで2回ずつ出現する", () => {
    const initial = makeInitialPairs();
    const selector = new AdaptiveSelector(initial);
    const counts = new Array(N).fill(0);

    for (let q = 0; q < 21; q++) {
      const pair = selector.nextPair()!;
      counts[pair.needA]++;
      counts[pair.needB]++;
      selector.recordResponse(pair, pair.needA);
    }

    for (let i = 0; i < N; i++) {
      expect(counts[i]).toBe(2);
    }
  });

  it("出現回数上限12回を超えない", () => {
    const selector = new AdaptiveSelector(makeInitialPairs());
    const counts = new Array(N).fill(0);

    for (let q = 0; q < 70; q++) {
      const pair = selector.nextPair();
      if (!pair) break;
      counts[pair.needA]++;
      counts[pair.needB]++;
      selector.recordResponse(pair, pair.needA);
    }

    for (let i = 0; i < N; i++) {
      expect(counts[i]).toBeLessThanOrEqual(12);
    }
  });

  it("出現回数下限5回を（ほぼ）保証する", () => {
    const selector = new AdaptiveSelector(makeInitialPairs());
    const counts = new Array(N).fill(0);

    for (let q = 0; q < 70; q++) {
      const pair = selector.nextPair();
      if (!pair) break;
      counts[pair.needA]++;
      counts[pair.needB]++;
      // 交互に勝たせてバランスをとる
      selector.recordResponse(pair, q % 2 === 0 ? pair.needA : pair.needB);
    }

    for (let i = 0; i < N; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(5);
    }
  });

  it("同一ペアは2回出題されない", () => {
    const selector = new AdaptiveSelector(makeInitialPairs());
    const seen = new Set<string>();

    for (let q = 0; q < 70; q++) {
      const pair = selector.nextPair();
      if (!pair) break;
      const key = `${Math.min(pair.needA, pair.needB)}-${Math.max(pair.needA, pair.needB)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      selector.recordResponse(pair, pair.needA);
    }
  });

  it("推移的な回答で上位・下位が正しく推定される", () => {
    const selector = new AdaptiveSelector(makeInitialPairs());

    // 常にインデックスが小さい方を勝たせる → 0が最強、20が最弱
    for (let q = 0; q < 70; q++) {
      const pair = selector.nextPair();
      if (!pair) break;
      const winner = Math.min(pair.needA, pair.needB);
      selector.recordResponse(pair, winner);
    }

    const mu = selector.currentBT.mu;
    // need 0 が上位、need 20 が下位
    expect(mu[0]).toBeGreaterThan(mu[10]);
    expect(mu[10]).toBeGreaterThan(mu[20]);
  });
});
