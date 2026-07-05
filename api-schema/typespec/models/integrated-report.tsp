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
  free_text: string;
}

/** 統合レポート生成リクエスト（作成結果） */
model IntegratedReportRequestResponse {
  /** リクエストID */
  id: string;

  /** トピック1 */
  topic1: int16;

  /** トピック2 */
  topic2: int16;

  /** トピック3 */
  topic3: int16;

  /** 自由記述 */
  free_text: string;

  /** 作成日時 */
  created_at: utcDateTime;
}

/** 統合レポート（リクエストID指定） */
model IntegratedReportResponse {
  /** レポートID */
  id: string;

  /** リクエストID */
  request_id: string;

  /** ユーザーID */
  user_id: string;

  /** レポート本文（Markdown） */
  content: string;

  /** 作成日時 */
  created_at: utcDateTime;

  /** 初回閲覧かどうか（このレスポンスで閲覧済みが記録される） */
  first_view: boolean;
}

/** 自分の最新統合レポート */
model IntegratedReportMineResponse {
  /** レポートID */
  id: string;

  /** リクエストID */
  request_id: string;

  /** レポート本文（Markdown） */
  content: string;

  /** 作成日時 */
  created_at: utcDateTime;

  /** 初回閲覧かどうか（このレスポンスで閲覧済みが記録される） */
  first_view: boolean;
}

/** 統合レポートのリクエスト状況 */
model IntegratedReportStatusResponse {
  /** none: リクエストなし / pending: 生成待ち / ready: レポートあり */
  status: "none" | "pending" | "ready";

  /** リクエストID（pending / ready のときのみ） */
  request_id?: string;
}

/** ユーザーの最新統合レポートリクエスト */
model IntegratedReportLatestRequestResponse {
  /** リクエストID */
  request_id: string;

  /** ユーザーID */
  user_id: string;

  /** レポートが生成済みかどうか */
  has_report: boolean;

  /** リクエスト作成日時 */
  created_at: utcDateTime;
}
