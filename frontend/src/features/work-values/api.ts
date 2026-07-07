import "@/external/client/api/client";
import {
  type ModelsAiReportResponse,
  type ModelsWvNeedDefResponse,
  type ModelsWvNeedScore,
  type ModelsWvPairResponse,
  type ModelsWvResponseItem,
  type ModelsWvResultResponse,
  type ModelsWvSessionResponse,
  type ModelsWvValueScoreResponse,
  teamDiagnoseStartDiagnoseWvSession,
  teamDiagnoseSubmitDiagnoseWvResult,
  workValuesWvGetAiReport,
  workValuesWvGetLatestResult,
  workValuesWvGetResultBySession,
  workValuesWvStartSession,
  workValuesWvSubmitResult,
} from "@/external/client/api/generated";

export type PairDTO = ModelsWvPairResponse;
export type NeedDefDTO = ModelsWvNeedDefResponse;
export type SessionDTO = ModelsWvSessionResponse;
export type ResponseDTO = ModelsWvResponseItem;
export type NeedScoreDTO = ModelsWvNeedScore;
export type ValueScoreDTO = ModelsWvValueScoreResponse;
export type ResultDTO = ModelsWvResultResponse;

// 認証Cookieのユーザー本人のセッションを開始する
export async function startSession(): Promise<SessionDTO> {
  const { data, error, response } = await workValuesWvStartSession({});
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

// チーム診断の招待メンバー用（未ログイン）。招待トークンが認可になる。
export async function startSessionByDiagnoseToken(token: string): Promise<SessionDTO> {
  const { data, error, response } = await teamDiagnoseStartDiagnoseWvSession({
    path: { token },
  });
  if (error || !data) throw new Error(`Failed to start session: ${response.status}`);
  return data;
}

export async function submitResultByDiagnoseToken(
  token: string,
  sessionId: string,
  responses: ResponseDTO[],
  mu: Record<string, number>,
  se: Record<string, number>,
): Promise<ResultDTO> {
  const { data, error, response } = await teamDiagnoseSubmitDiagnoseWvResult({
    path: { token, sessionId },
    body: { responses, mu, se },
  });
  if (error || !data) throw new Error(`Failed to submit result: ${response.status}`);
  return data;
}

// cookieHeader はSSR（サーバコンポーネント）から呼ぶ際に認証Cookieを転送するために渡す
export async function getResultBySessionId(
  sessionId: string,
  cookieHeader?: string,
): Promise<ResultDTO> {
  const { data, error, response } = await workValuesWvGetResultBySession({
    path: { sessionId },
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
  if (error || !data) throw new Error(`Failed to fetch result: ${response.status}`);
  return data;
}

export async function getLatestResult(
  userId: string,
  cookieHeader?: string,
): Promise<ResultDTO | null> {
  const { data, error, response } = await workValuesWvGetLatestResult({
    path: { userId },
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
  if (response.status === 404) return null;
  if (error || !data) throw new Error(`Failed to fetch latest result: ${response.status}`);
  return data;
}

export type AiReportDTO = ModelsAiReportResponse;

// AIレポート取得。未生成（404）等のエラーは null を返す。
export async function getAiReport(
  sessionId: string,
  cookieHeader?: string,
): Promise<AiReportDTO | null> {
  const { data, error } = await workValuesWvGetAiReport({
    path: { sessionId },
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
  if (error || !data) return null;
  return data;
}
