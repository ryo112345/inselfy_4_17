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
  workValuesWvRequestAiReport,
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
  if (error || !data) throw new Error(`Failed to start session: ${response?.status}`);
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
  if (error || !data) throw new Error(`Failed to submit result: ${response?.status}`);
  return data;
}

// チーム診断の招待メンバー用（未ログイン）。招待トークンが認可になる。
export async function startSessionByDiagnoseToken(token: string): Promise<SessionDTO> {
  const { data, error, response } = await teamDiagnoseStartDiagnoseWvSession({
    path: { token },
  });
  if (error || !data) throw new Error(`Failed to start session: ${response?.status}`);
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
  if (error || !data) throw new Error(`Failed to submit result: ${response?.status}`);
  return data;
}

// SSR（サーバコンポーネント）からの認証Cookie転送は @/external/client/api/server の
// interceptor が担うため、呼び出し側での cookie 手渡しは不要。
export async function getResultBySessionId(sessionId: string): Promise<ResultDTO> {
  const { data, error, response } = await workValuesWvGetResultBySession({
    path: { sessionId },
  });
  if (error || !data) throw new Error(`Failed to fetch result: ${response?.status}`);
  return data;
}

export async function getLatestResult(userId: string): Promise<ResultDTO | null> {
  const { data, error, response } = await workValuesWvGetLatestResult({
    path: { userId },
  });
  if (response?.status === 404) return null;
  if (error || !data) throw new Error(`Failed to fetch latest result: ${response?.status}`);
  return data;
}

export type AiReportDTO = ModelsAiReportResponse;

// AIレポート取得。未生成（404）等のエラーは null を返す。
export async function getAiReport(sessionId: string): Promise<AiReportDTO | null> {
  const { data, error } = await workValuesWvGetAiReport({
    path: { sessionId },
  });
  if (error || !data) return null;
  return data;
}

// AIレポートの作成依頼（セッション所有者のみ・冪等）
export async function requestAiReport(sessionId: string): Promise<void> {
  const { error, response } = await workValuesWvRequestAiReport({
    path: { sessionId },
  });
  if (error) throw new Error(`Failed to request AI report: ${response?.status}`);
}
