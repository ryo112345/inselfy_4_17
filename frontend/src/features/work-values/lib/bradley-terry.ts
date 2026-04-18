import { N } from "./needs";

const SIGMA_SQ = 3.0;
const MAX_ITER = 100;
const TOL = 1e-6;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export interface BTResult {
  mu: number[];
  se: number[];
}

/**
 * Bradley-Terry モデルを Newton-Raphson 法で推定する。
 * wins[i][j] = ニーズ i が j に勝った回数。
 */
export function estimateBT(wins: number[][]): BTResult {
  const mu = new Array(N).fill(0);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const grad = new Array(N).fill(0);
    const H = Array.from({ length: N }, () => new Array(N).fill(0));

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const nij = wins[i][j] + wins[j][i];
        if (nij === 0) continue;

        const pij = sigmoid(mu[i] - mu[j]);
        const w = pij * (1 - pij);

        grad[i] += wins[i][j] - nij * pij;
        grad[j] -= wins[i][j] - nij * pij;

        H[i][i] -= nij * w;
        H[j][j] -= nij * w;
        H[i][j] += nij * w;
        H[j][i] += nij * w;
      }

      grad[i] -= mu[i] / SIGMA_SQ;
      H[i][i] -= 1 / SIGMA_SQ;
    }

    const delta = solveLinear(H, grad);
    if (!delta) break;

    let maxDelta = 0;
    for (let i = 0; i < N; i++) {
      mu[i] -= delta[i];
      maxDelta = Math.max(maxDelta, Math.abs(delta[i]));
    }

    const mean = mu.reduce((s, v) => s + v, 0) / N;
    for (let i = 0; i < N; i++) mu[i] -= mean;

    if (maxDelta < TOL) break;
  }

  const se = computeSE(mu, wins);

  return { mu, se };
}

/**
 * ヘッセ行列の逆行列の対角要素から SE を計算する。
 */
function computeSE(mu: number[], wins: number[][]): number[] {
  const H = Array.from({ length: N }, () => new Array(N).fill(0));

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const nij = wins[i][j] + wins[j][i];
      if (nij === 0) continue;

      const pij = sigmoid(mu[i] - mu[j]);
      const w = nij * pij * (1 - pij);

      H[i][i] += w;
      H[j][j] += w;
      H[i][j] -= w;
      H[j][i] -= w;
    }
    H[i][i] += 1 / SIGMA_SQ;
  }

  const invH = invertMatrix(H);
  if (!invH) return new Array(N).fill(Infinity);

  return invH.map((row, i) => Math.sqrt(Math.max(0, row[i])));
}

/**
 * H * x = b を解く（ガウス消去法）。
 * H は負定値なので -H * x = -b として解く。
 */
function solveLinear(H: number[][], b: number[]): number[] | null {
  const n = H.length;
  const A = H.map((row, i) => [...row.map((v) => -v), -b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotVal = Math.abs(A[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > pivotVal) {
        pivotRow = row;
        pivotVal = Math.abs(A[row][col]);
      }
    }
    if (pivotVal < 1e-12) return null;

    if (pivotRow !== col) {
      [A[col], A[pivotRow]] = [A[pivotRow], A[col]];
    }

    const pivot = A[col][col];
    for (let j = col; j <= n; j++) A[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = A[row][col];
      for (let j = col; j <= n; j++) {
        A[row][j] -= factor * A[col][j];
      }
    }
  }

  return A.map((row) => row[n]);
}

/**
 * 行列の逆行列を計算する（ガウス・ジョルダン法）。
 */
function invertMatrix(M: number[][]): number[][] | null {
  const n = M.length;
  const aug = M.map((row, i) => {
    const ext = new Array(n).fill(0);
    ext[i] = 1;
    return [...row, ...ext];
  });

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > pivotVal) {
        pivotRow = row;
        pivotVal = Math.abs(aug[row][col]);
      }
    }
    if (pivotVal < 1e-12) return null;

    if (pivotRow !== col) {
      [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
    }

    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map((row) => row.slice(n));
}
