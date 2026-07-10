import { skipAuthRedirect } from "@/external/client/api/client";
import {
  integratedReportCreateIntegratedReportRequest,
  integratedReportGetIntegratedReport,
  integratedReportGetIntegratedReportStatus,
  integratedReportGetLatestIntegratedRequest,
  type ModelsCreateIntegratedReportRequest,
  type ModelsIntegratedReportLatestRequestResponse,
  type ModelsIntegratedReportResponse,
  type ModelsIntegratedReportStatusResponse,
} from "@/external/client/api/generated";
import { run } from "@/lib/api-result";

export type IntegratedReportStatus = ModelsIntegratedReportStatusResponse["status"];

// リクエスト状況取得（要ログイン）。ベストエフォート取得のため
// 未ログインの 401 では /login に飛ばさず null を返す。
export async function getIntegratedReportStatus(): Promise<ModelsIntegratedReportStatusResponse | null> {
  const { data, error } = await integratedReportGetIntegratedReportStatus({
    ...skipAuthRedirect,
  });
  if (error || !data) return null;
  return data;
}

// レポート生成リクエスト作成（要ログイン）。失敗時はサーバのエラーメッセージで throw。
export async function createIntegratedReportRequest(
  body: ModelsCreateIntegratedReportRequest,
): Promise<void> {
  await run(integratedReportCreateIntegratedReportRequest({ body }), "リクエストに失敗しました");
}

// リクエストIDでレポート取得（公開）。未生成（404）等のエラーは null を返す。
export async function getIntegratedReport(
  requestId: string,
): Promise<ModelsIntegratedReportResponse | null> {
  const { data, error } = await integratedReportGetIntegratedReport({ path: { requestId } });
  if (error || !data) return null;
  return data;
}

// ユーザーの最新リクエスト取得（公開）。リクエストが無ければ null。
export async function getLatestIntegratedRequest(
  userId: string,
): Promise<ModelsIntegratedReportLatestRequestResponse | null> {
  const { data, error } = await integratedReportGetLatestIntegratedRequest({ path: { userId } });
  if (error || !data) return null;
  return data;
}
