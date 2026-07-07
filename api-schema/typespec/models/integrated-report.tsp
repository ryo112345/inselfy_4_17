import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 統合レポート生成リクエスト作成リクエスト */
model CreateIntegratedReportRequest {
  /** トピック1（1〜10、topic2/topic3 と重複不可） */
  topic1: int16;

  /** トピック2（1〜10） */
  topic2: int16;

  /** トピック3（1〜10） */
  topic3: int16;

  /** 自由記述（200文字以内） */
  freeText: string;
}

/** 統合レポート生成リクエスト（作成結果） */
model IntegratedReportRequestResponse {
  /** リクエストID */
  id: Uuid;

  /** トピック1 */
  topic1: int16;

  /** トピック2 */
  topic2: int16;

  /** トピック3 */
  topic3: int16;

  /** 自由記述 */
  freeText: string;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** 統合レポート（リクエストID指定） */
model IntegratedReportResponse {
  /** レポートID */
  id: Uuid;

  /** リクエストID */
  requestId: Uuid;

  /** ユーザーID */
  userId: Uuid;

  /** レポート本文（Markdown） */
  content: string;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 初回閲覧かどうか（このレスポンスで閲覧済みが記録される） */
  firstView: boolean;
}

/** 自分の最新統合レポート */
model IntegratedReportMineResponse {
  /** レポートID */
  id: Uuid;

  /** リクエストID */
  requestId: Uuid;

  /** レポート本文（Markdown） */
  content: string;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 初回閲覧かどうか（このレスポンスで閲覧済みが記録される） */
  firstView: boolean;
}

/** 統合レポートのリクエスト状況 */
model IntegratedReportStatusResponse {
  /** none: リクエストなし / pending: 生成待ち / ready: レポートあり */
  status: "none" | "pending" | "ready";

  /** リクエストID（pending / ready のときのみ） */
  requestId?: Uuid;
}

/** ユーザーの最新統合レポートリクエスト */
model IntegratedReportLatestRequestResponse {
  /** リクエストID */
  requestId: Uuid;

  /** ユーザーID */
  userId: Uuid;

  /** レポートが生成済みかどうか */
  hasReport: boolean;

  /** リクエスト作成日時 */
  createdAt: utcDateTime;
}
