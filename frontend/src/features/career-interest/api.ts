import "@/external/client/api/client";
import {
  careerInterestCiGetLatestResult,
  careerInterestCiGetResultBySession,
  careerInterestCiStartSession,
  careerInterestCiSubmitResult,
  type ModelsCiBasicScoreResponse,
  type ModelsCiItemResponse,
  type ModelsCiResponseItem,
  type ModelsCiResultResponse,
  type ModelsCiSessionResponse,
  type ModelsCiTypeScoreResponse,
} from "@/external/client/api/generated";

export type ItemDTO = ModelsCiItemResponse;
export type SessionDTO = ModelsCiSessionResponse;
export type ResponseDTO = ModelsCiResponseItem;
export type BasicScoreDTO = ModelsCiBasicScoreResponse;
export type TypeScoreDTO = ModelsCiTypeScoreResponse;
export type ResultDTO = ModelsCiResultResponse;

export async function startSession(userId: string): Promise<SessionDTO> {
  const { data, error, response } = await careerInterestCiStartSession({
    body: { user_id: userId },
  });
  if (error || !data) throw new Error(`Failed to start session: ${response.status}`);
  return data;
}

export async function submitResult(
  sessionId: string,
  responses: ResponseDTO[],
): Promise<ResultDTO> {
  const { data, error, response } = await careerInterestCiSubmitResult({
    path: { sessionId },
    body: { responses },
  });
  if (error || !data) throw new Error(`Failed to submit result: ${response.status}`);
  return data;
}

export async function getResultBySessionId(sessionId: string): Promise<ResultDTO> {
  const { data, error, response } = await careerInterestCiGetResultBySession({
    path: { sessionId },
  });
  if (error || !data) throw new Error(`Failed to fetch result: ${response.status}`);
  return data;
}

export async function getLatestResult(userId: string): Promise<ResultDTO | null> {
  const { data, error, response } = await careerInterestCiGetLatestResult({
    path: { userId },
  });
  if (response.status === 404) return null;
  if (error || !data) throw new Error(`Failed to fetch latest result: ${response.status}`);
  return data;
}
