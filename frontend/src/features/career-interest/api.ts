import "@/external/client/api/client";
import {
  careerInterestCiGetAiReport,
  careerInterestCiGetLatestResult,
  careerInterestCiGetResultBySession,
  careerInterestCiRequestAiReport,
  careerInterestCiStartSession,
  careerInterestCiSubmitResult,
  type ModelsAiReportResponse,
  type ModelsCiBasicScoreResponse,
  type ModelsCiItemResponse,
  type ModelsCiResponseItem,
  type ModelsCiResultResponse,
  type ModelsCiSessionResponse,
  type ModelsCiTypeScoreResponse,
  teamDiagnoseStartDiagnoseCiSession,
  teamDiagnoseSubmitDiagnoseCiResult,
} from "@/external/client/api/generated";

export type ItemDTO = ModelsCiItemResponse;
export type SessionDTO = ModelsCiSessionResponse;
export type ResponseDTO = ModelsCiResponseItem;
export type BasicScoreDTO = ModelsCiBasicScoreResponse;
export type TypeScoreDTO = ModelsCiTypeScoreResponse;
export type ResultDTO = ModelsCiResultResponse;

// 認証Cookieのユーザー本人のセッションを開始する
export async function startSession(): Promise<SessionDTO> {
  const { data, error, response } = await careerInterestCiStartSession({});
  if (error || !data) throw new Error(`Failed to start session: ${response?.status}`);
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
  if (error || !data) throw new Error(`Failed to submit result: ${response?.status}`);
  return data;
}

// チーム診断の招待メンバー用（未ログイン）。招待トークンが認可になる。
export async function startSessionByDiagnoseToken(token: string): Promise<SessionDTO> {
  const { data, error, response } = await teamDiagnoseStartDiagnoseCiSession({
    path: { token },
  });
  if (error || !data) throw new Error(`Failed to start session: ${response?.status}`);
  return data;
}

export async function submitResultByDiagnoseToken(
  token: string,
  sessionId: string,
  responses: ResponseDTO[],
): Promise<ResultDTO> {
  const { data, error, response } = await teamDiagnoseSubmitDiagnoseCiResult({
    path: { token, sessionId },
    body: { responses },
  });
  if (error || !data) throw new Error(`Failed to submit result: ${response?.status}`);
  return data;
}

// SSR（サーバコンポーネント）からの認証Cookie転送は @/external/client/api/server の
// interceptor が担うため、呼び出し側での cookie 手渡しは不要。
export async function getResultBySessionId(sessionId: string): Promise<ResultDTO> {
  const { data, error, response } = await careerInterestCiGetResultBySession({
    path: { sessionId },
  });
  if (error || !data) throw new Error(`Failed to fetch result: ${response?.status}`);
  return data;
}

export async function getLatestResult(userId: string): Promise<ResultDTO | null> {
  const { data, error, response } = await careerInterestCiGetLatestResult({
    path: { userId },
  });
  if (response?.status === 404) return null;
  if (error || !data) throw new Error(`Failed to fetch latest result: ${response?.status}`);
  return data;
}

export type AiReportDTO = ModelsAiReportResponse;

// AIレポート取得。未生成（404）等のエラーは null を返す。
export async function getAiReport(sessionId: string): Promise<AiReportDTO | null> {
  const { data, error } = await careerInterestCiGetAiReport({
    path: { sessionId },
  });
  if (error || !data) return null;
  return data;
}

// AIレポートの作成依頼（セッション所有者のみ・冪等）
export async function requestAiReport(sessionId: string): Promise<void> {
  const { error, response } = await careerInterestCiRequestAiReport({
    path: { sessionId },
  });
  if (error) throw new Error(`Failed to request AI report: ${response?.status}`);
}
