// 統合レポートの薄いラッパー層。ベストエフォート取得（null 返し）の加工があるため
// 手書きを維持し、内部だけ orval 生成の平関数に置き換えている。
// 非2xx は mutator が ApiError を throw する。
import { skipAuthRedirect } from "@/external/client/api/orval/custom-fetch";
import {
  integratedReportCreateIntegratedReportRequest,
  integratedReportGetIntegratedReport,
  integratedReportGetIntegratedReportStatus,
  integratedReportGetLatestIntegratedRequest,
} from "@/external/client/api/orval/generated/endpoints/integrated-report/integrated-report";
import type {
  ModelsCreateIntegratedReportRequest,
  ModelsIntegratedReportLatestRequestResponse,
  ModelsIntegratedReportResponse,
  ModelsIntegratedReportStatusResponse,
} from "@/external/client/api/orval/generated/models";

export type IntegratedReportStatus = ModelsIntegratedReportStatusResponse["status"];

// リクエスト状況取得（要ログイン）。ベストエフォート取得のため
// 未ログインの 401 では /login に飛ばさず null を返す。
export async function getIntegratedReportStatus(): Promise<ModelsIntegratedReportStatusResponse | null> {
  try {
    return await integratedReportGetIntegratedReportStatus(skipAuthRedirect);
  } catch {
    return null;
  }
}

// レポート生成リクエスト作成（要ログイン）。失敗時はサーバのエラーメッセージで throw。
export async function createIntegratedReportRequest(
  body: ModelsCreateIntegratedReportRequest,
): Promise<void> {
  await integratedReportCreateIntegratedReportRequest(body);
}

// リクエストIDでレポート取得（公開）。未生成（404）等のエラーは null を返す。
export async function getIntegratedReport(
  requestId: string,
): Promise<ModelsIntegratedReportResponse | null> {
  try {
    return await integratedReportGetIntegratedReport(requestId);
  } catch {
    return null;
  }
}

// ユーザーの最新リクエスト取得（公開）。リクエストが無ければ null。
export async function getLatestIntegratedRequest(
  userId: string,
): Promise<ModelsIntegratedReportLatestRequestResponse | null> {
  try {
    return await integratedReportGetLatestIntegratedRequest(userId);
  } catch {
    return null;
  }
}
