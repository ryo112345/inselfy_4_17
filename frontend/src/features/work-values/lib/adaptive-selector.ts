import { type BTResult, estimateBT } from "./bradley-terry";
import { N, NEED_IDS, type NeedId } from "./needs";

export interface Pair {
  needA: number;
  needB: number;
}

export interface Response {
  needA: number;
  needB: number;
  winner: number;
  questionNumber: number;
}

const MAX_QUESTIONS = 70;
const MAX_APPEARANCES = 12;
const MIN_APPEARANCES = 5;
const RECENT_WINDOW = 3;
const MAX_RECENT_APPEARANCES = 1;

export class AdaptiveSelector {
  private wins: number[][];
  private responses: Response[] = [];
  private appearances: number[];
  private recentNeeds: number[] = [];
  private askedPairs: Set<string>;
  private initialPairs: Pair[];
  private bt: BTResult;

  constructor(initialPairs: Pair[]) {
    this.wins = Array.from({ length: N }, () => new Array(N).fill(0));
    this.appearances = new Array(N).fill(0);
    this.askedPairs = new Set();
    this.initialPairs = initialPairs;
    this.bt = { mu: new Array(N).fill(0), se: new Array(N).fill(Infinity) };
  }

  get questionCount(): number {
    return this.responses.length;
  }

  get currentBT(): BTResult {
    return this.bt;
  }

  get allResponses(): Response[] {
    return this.responses;
  }

  get needAppearances(): number[] {
    return [...this.appearances];
  }

  get boundaryGaps(): {
    upper: { diff: number; seSum: number };
    lower: { diff: number; seSum: number };
  } {
    const ranked = this.getRankedIndices();
    const mu = this.bt.mu;
    const se = this.bt.se;
    const top3 = ranked[2];
    const top4 = ranked[3];
    const bot18 = ranked[17];
    const bot19 = ranked[18];
    return {
      upper: { diff: mu[top3] - mu[top4], seSum: se[top3] + se[top4] },
      lower: { diff: mu[bot18] - mu[bot19], seSum: se[bot18] + se[bot19] },
    };
  }

  get isComplete(): boolean {
    return this.questionCount >= MAX_QUESTIONS;
  }

  nextPair(): Pair | null {
    if (this.isComplete) return null;

    if (this.questionCount < this.initialPairs.length) {
      return this.initialPairs[this.questionCount];
    }

    return this.selectAdaptivePair();
  }

  recordResponse(pair: Pair, winner: number): void {
    const { needA, needB } = pair;
    this.wins[winner === needA ? needA : needB][winner === needA ? needB : needA] = 1;
    this.responses.push({ needA, needB, winner, questionNumber: this.responses.length + 1 });
    this.appearances[needA]++;
    this.appearances[needB]++;
    this.askedPairs.add(pairKey(needA, needB));
    this.recentNeeds.push(needA, needB);
    if (this.recentNeeds.length > RECENT_WINDOW * 2) {
      this.recentNeeds = this.recentNeeds.slice(-RECENT_WINDOW * 2);
    }

    this.bt = estimateBT(this.wins);
  }

  private selectAdaptivePair(): Pair {
    const urgentPair = this.checkMinAppearanceUrgency();
    if (urgentPair) return urgentPair;

    const ranked = this.getRankedIndices();
    let bestScore = -1;
    let bestPair: Pair = { needA: 0, needB: 1 };

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        if (this.askedPairs.has(pairKey(i, j))) continue;
        if (this.appearances[i] >= MAX_APPEARANCES || this.appearances[j] >= MAX_APPEARANCES)
          continue;
        if (this.violatesRecentConstraint(i, j)) continue;

        const pij = sigmoid(this.bt.mu[i] - this.bt.mu[j]);
        const info = pij * (1 - pij);
        const weight = this.boundaryWeight(i, j, ranked);
        const score = info * weight;

        if (score > bestScore) {
          bestScore = score;
          bestPair = { needA: i, needB: j };
        }
      }
    }

    return bestPair;
  }

  private boundaryWeight(i: number, j: number, ranked: number[]): number {
    const rankI = ranked.indexOf(i);
    const rankJ = ranked.indexOf(j);

    const isBoundary = (rank: number) => (rank >= 1 && rank <= 4) || (rank >= 16 && rank <= 19);
    const isExtreme = (rank: number) => rank === 0 || rank === 20;

    if (isBoundary(rankI) || isBoundary(rankJ)) return 3.0;
    if (isExtreme(rankI) || isExtreme(rankJ)) return 1.5;
    return 1.0;
  }

  private checkMinAppearanceUrgency(): Pair | null {
    const remaining = MAX_QUESTIONS - this.questionCount;

    const needsBelow = [];
    for (let i = 0; i < N; i++) {
      if (this.appearances[i] < MIN_APPEARANCES) {
        needsBelow.push(i);
      }
    }
    if (needsBelow.length === 0) return null;

    const slotsNeeded = needsBelow.reduce(
      (sum, i) => sum + (MIN_APPEARANCES - this.appearances[i]),
      0,
    );
    if (slotsNeeded < remaining / 2) return null;

    const deficit: { need: number; shortage: number }[] = needsBelow.map((i) => ({
      need: i,
      shortage: MIN_APPEARANCES - this.appearances[i],
    }));

    if (deficit.length === 0) return null;

    deficit.sort((a, b) => b.shortage - a.shortage);
    const urgentNeed = deficit[0].need;

    let bestScore = -1;
    let bestPair: Pair | null = null;

    for (let j = 0; j < N; j++) {
      if (j === urgentNeed) continue;
      if (this.askedPairs.has(pairKey(urgentNeed, j))) continue;
      if (this.appearances[j] >= MAX_APPEARANCES) continue;
      if (this.violatesRecentConstraint(urgentNeed, j)) continue;

      const pij = sigmoid(this.bt.mu[urgentNeed] - this.bt.mu[j]);
      const score = pij * (1 - pij);

      if (score > bestScore) {
        bestScore = score;
        bestPair = {
          needA: Math.min(urgentNeed, j),
          needB: Math.max(urgentNeed, j),
        };
      }
    }

    return bestPair;
  }

  private violatesRecentConstraint(a: number, b: number): boolean {
    const window = this.recentNeeds.slice(-RECENT_WINDOW * 2);
    const countA = window.filter((n) => n === a).length;
    const countB = window.filter((n) => n === b).length;
    return countA >= MAX_RECENT_APPEARANCES || countB >= MAX_RECENT_APPEARANCES;
  }

  private getRankedIndices(): number[] {
    return Array.from({ length: N }, (_, i) => i).sort((a, b) => this.bt.mu[b] - this.bt.mu[a]);
  }
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
