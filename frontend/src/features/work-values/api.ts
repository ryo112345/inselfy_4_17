import "@/external/client/api/client";
import {
  workValuesWvGetLatestResult,
  workValuesWvGetResultBySession,
  workValuesWvStartSession,
  workValuesWvSubmitResult,
  type ModelsWvNeedDefResponse,
  type ModelsWvNeedScore,
  type ModelsWvPairResponse,
  type ModelsWvResponseItem,
  type ModelsWvResultResponse,
  type ModelsWvSessionResponse,
  type ModelsWvValueScoreResponse,
} from "@/external/client/api/generated";

export type PairDTO = ModelsWvPairResponse;
export type NeedDefDTO = ModelsWvNeedDefResponse;
export type SessionDTO = ModelsWvSessionResponse;
export type ResponseDTO = ModelsWvResponseItem;
export type NeedScoreDTO = ModelsWvNeedScore;
export type ValueScoreDTO = ModelsWvValueScoreResponse;
export type ResultDTO = ModelsWvResultResponse;

export async function startSession(userId: string): Promise<SessionDTO> {
  const { data, error, response } = await workValuesWvStartSession({
    body: { user_id: userId },
  });
  if (error || !data) throw new Error(`Failed to start session: ${response.status}`);
  return data;
}

export async function submitResult(
  sessionId: string,
  responses: ResponseDTO[],
  mu: Record<string, number>,
  se: Record<string, number>,
): Promise<ResultDTO> {
  const { data, error, response } = await workValuesWvSubmitResult({
    path: { sessionId },
    body: { responses, mu, se },
  });
  if (error || !data) throw new Error(`Failed to submit result: ${response.status}`);
  return data;
}

export async function getResultBySessionId(sessionId: string): Promise<ResultDTO> {
  const { data, error, response } = await workValuesWvGetResultBySession({
    path: { sessionId },
  });
  if (error || !data) throw new Error(`Failed to fetch result: ${response.status}`);
  return data;
}

export async function getLatestResult(userId: string): Promise<ResultDTO | null> {
  const { data, error, response } = await workValuesWvGetLatestResult({
    path: { userId },
  });
  if (response.status === 404) return null;
  if (error || !data) throw new Error(`Failed to fetch latest result: ${response.status}`);
  return data;
}
