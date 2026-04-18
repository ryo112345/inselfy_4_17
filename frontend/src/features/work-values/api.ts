const INTERNAL_BASE =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL ?? "http://localhost:8081") + "/api/work-values"
    : "/api/work-values";
const BASE_URL = "/api/work-values";

export interface PairDTO {
  need_a: string;
  need_b: string;
}

export interface NeedDefDTO {
  id: string;
  label: string;
  description_ja: string;
}

export interface SessionDTO {
  id: string;
  status: string;
  initial_pairs: PairDTO[];
  needs: NeedDefDTO[];
}

export interface ResponseDTO {
  need_a: string;
  need_b: string;
  winner: string;
  question_number: number;
}

export interface NeedScoreDTO {
  need_id: string;
  label: string;
  description_ja: string;
  display_score: number;
  rank: number;
}

export interface ValueScoreDTO {
  value_id: string;
  display_score: number;
  rank: number;
}

export interface ResultDTO {
  id: string;
  session_id: string;
  user_id: string;
  needs: NeedScoreDTO[];
  values: ValueScoreDTO[];
}

export async function startSession(userId: string): Promise<SessionDTO> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error(`Failed to start session: ${res.status}`);
  return res.json();
}

export async function submitResult(
  sessionId: string,
  responses: ResponseDTO[],
  mu: Record<string, number>,
  se: Record<string, number>,
): Promise<ResultDTO> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responses, mu, se }),
  });
  if (!res.ok) throw new Error(`Failed to submit result: ${res.status}`);
  return res.json();
}

export async function getResultBySessionId(sessionId: string): Promise<ResultDTO> {
  const base = typeof window === "undefined" ? INTERNAL_BASE : BASE_URL;
  const res = await fetch(`${base}/sessions/${sessionId}/results`);
  if (!res.ok) throw new Error(`Failed to fetch result: ${res.status}`);
  return res.json();
}

export async function getLatestResult(userId: string): Promise<ResultDTO | null> {
  const res = await fetch(`${INTERNAL_BASE}/users/${userId}/results/latest`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch latest result: ${res.status}`);
  return res.json();
}
