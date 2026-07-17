// Work Values 診断の薄いラッパー層。診断フローは BT モデルのリアルタイム推定と
// 密結合の命令的コードのためシグネチャを維持し、内部だけ orval 生成の平関数に
// 置き換えている。非2xx は mutator が ApiError を throw する。
import {
  teamDiagnoseStartDiagnoseWvSession,
  teamDiagnoseSubmitDiagnoseWvResult,
} from "@/external/client/api/orval/generated/endpoints/team-diagnose/team-diagnose";
import {
  workValuesWvGetAiReport,
  workValuesWvGetLatestResult,
  workValuesWvGetResultBySession,
  workValuesWvRequestAiReport,
  workValuesWvStartSession,
  workValuesWvSubmitResult,
} from "@/external/client/api/orval/generated/endpoints/work-values/work-values";
import type {
  ModelsAiReportResponse,
  ModelsWVNeedDefResponse,
  ModelsWVNeedScore,
  ModelsWVPairResponse,
  ModelsWVResponseItem,
  ModelsWVResultResponse,
  ModelsWVSessionResponse,
  ModelsWVValueScoreResponse,
} from "@/external/client/api/orval/generated/models";
import { ApiError } from "@/lib/api-result";

export type PairDTO = ModelsWVPairResponse;
export type NeedDefDTO = ModelsWVNeedDefResponse;
export type SessionDTO = ModelsWVSessionResponse;
export type ResponseDTO = ModelsWVResponseItem;
export type NeedScoreDTO = ModelsWVNeedScore;
export type ValueScoreDTO = ModelsWVValueScoreResponse;
export type ResultDTO = ModelsWVResultResponse;

// 認証Cookieのユーザー本人のセッションを開始する
export async function startSession(): Promise<SessionDTO> {
  return workValuesWvStartSession();
}

export async function submitResult(
  sessionId: string,
  responses: ResponseDTO[],
  mu: Record<string, number>,
  se: Record<string, number>,
): Promise<ResultDTO> {
  return workValuesWvSubmitResult(sessionId, { responses, mu, se });
}

// チーム診断の招待メンバー用（未ログイン）。招待トークンが認可になる。
export async function startSessionByDiagnoseToken(token: string): Promise<SessionDTO> {
  return teamDiagnoseStartDiagnoseWvSession(token);
}

export async function submitResultByDiagnoseToken(
  token: string,
  sessionId: string,
  responses: ResponseDTO[],
  mu: Record<string, number>,
  se: Record<string, number>,
): Promise<ResultDTO> {
  return teamDiagnoseSubmitDiagnoseWvResult(token, sessionId, { responses, mu, se });
}

// SSR（サーバコンポーネント）からの認証Cookie転送は orval/server.ts の
// provider 注入が担うため、呼び出し側での cookie 手渡しは不要。
export async function getResultBySessionId(sessionId: string): Promise<ResultDTO> {
  return workValuesWvGetResultBySession(sessionId);
}

export async function getLatestResult(userId: string): Promise<ResultDTO | null> {
  try {
    return await workValuesWvGetLatestResult(userId);
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
    return await workValuesWvGetAiReport(sessionId);
  } catch {
    return null;
  }
}

// AIレポートの作成依頼（セッション所有者のみ・冪等）
export async function requestAiReport(sessionId: string): Promise<void> {
  await workValuesWvRequestAiReport(sessionId);
}
