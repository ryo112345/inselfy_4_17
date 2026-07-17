// Career Interest 診断の薄いラッパー層。診断フローと密結合の命令的コードのため
// シグネチャを維持し、内部だけ orval 生成の平関数に置き換えている。
// 非2xx は mutator が ApiError を throw する。
import {
  careerInterestCiGetAiReport,
  careerInterestCiGetLatestResult,
  careerInterestCiGetResultBySession,
  careerInterestCiRequestAiReport,
  careerInterestCiStartSession,
  careerInterestCiSubmitResult,
} from "@/external/client/api/orval/generated/endpoints/career-interest/career-interest";
import {
  teamDiagnoseStartDiagnoseCiSession,
  teamDiagnoseSubmitDiagnoseCiResult,
} from "@/external/client/api/orval/generated/endpoints/team-diagnose/team-diagnose";
import type {
  ModelsAiReportResponse,
  ModelsCIBasicScoreResponse,
  ModelsCIItemResponse,
  ModelsCIResponseItem,
  ModelsCIResultResponse,
  ModelsCISessionResponse,
  ModelsCITypeScoreResponse,
} from "@/external/client/api/orval/generated/models";
import { ApiError } from "@/lib/api-result";

export type ItemDTO = ModelsCIItemResponse;
export type SessionDTO = ModelsCISessionResponse;
export type ResponseDTO = ModelsCIResponseItem;
export type BasicScoreDTO = ModelsCIBasicScoreResponse;
export type TypeScoreDTO = ModelsCITypeScoreResponse;
export type ResultDTO = ModelsCIResultResponse;

// 認証Cookieのユーザー本人のセッションを開始する
export async function startSession(): Promise<SessionDTO> {
  return careerInterestCiStartSession();
}

export async function submitResult(
  sessionId: string,
  responses: ResponseDTO[],
): Promise<ResultDTO> {
  return careerInterestCiSubmitResult(sessionId, { responses });
}

// チーム診断の招待メンバー用（未ログイン）。招待トークンが認可になる。
export async function startSessionByDiagnoseToken(token: string): Promise<SessionDTO> {
  return teamDiagnoseStartDiagnoseCiSession(token);
}

export async function submitResultByDiagnoseToken(
  token: string,
  sessionId: string,
  responses: ResponseDTO[],
): Promise<ResultDTO> {
  return teamDiagnoseSubmitDiagnoseCiResult(token, sessionId, { responses });
}

// SSR（サーバコンポーネント）からの認証Cookie転送は orval/server.ts の
// provider 注入が担うため、呼び出し側での cookie 手渡しは不要。
export async function getResultBySessionId(sessionId: string): Promise<ResultDTO> {
  return careerInterestCiGetResultBySession(sessionId);
}

export async function getLatestResult(userId: string): Promise<ResultDTO | null> {
  try {
    return await careerInterestCiGetLatestResult(userId);
  } catch (err) {
    // 未受診（404）は結果なしとして扱う
    if (err instanceof ApiError && err.code === "NOT_FOUND") return null;
    throw err;
  }
}

export type AiReportDTO = ModelsAiReportResponse;

// AIレポート取得。未生成（404）等のエラーは null を返す。
export async function getAiReport(sessionId: string): Promise<AiReportDTO | null> {
  try {
    return await careerInterestCiGetAiReport(sessionId);
  } catch {
    return null;
  }
}

// AIレポートの作成依頼（セッション所有者のみ・冪等）
export async function requestAiReport(sessionId: string): Promise<void> {
  await careerInterestCiRequestAiReport(sessionId);
}
