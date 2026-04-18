const INTERNAL_BASE =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL ?? "http://localhost:8081") + "/api/career-interest"
    : "/api/career-interest";
const BASE_URL = "/api/career-interest";

export interface ItemDTO {
  question_number: number;
  item_code: string;
  basic_interest_id: string;
  skill_level: string;
  activity_type: string;
  text_ja: string;
}

export interface SessionDTO {
  id: string;
  status: string;
  items: ItemDTO[];
}

export interface ResponseDTO {
  question_number: number;
  item_code: string;
  score: number;
}

export interface BasicScoreDTO {
  basic_interest_id: string;
  score: number;
  rank: number;
}

export interface TypeScoreDTO {
  type_id: string;
  score: number;
  rank: number;
}

export interface ResultDTO {
  id: string;
  session_id: string;
  user_id: string;
  basic_scores: BasicScoreDTO[];
  type_scores: TypeScoreDTO[];
  created_at: string;
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
): Promise<ResultDTO> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responses }),
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
