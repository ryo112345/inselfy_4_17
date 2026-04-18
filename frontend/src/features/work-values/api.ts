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
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/results`);
  if (!res.ok) throw new Error(`Failed to fetch result: ${res.status}`);
  return res.json();
}
