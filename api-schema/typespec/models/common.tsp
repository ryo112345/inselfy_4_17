import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 共通エラーレスポンス */
@error
model ErrorResponse {
  /** エラーコード */
  code: string;

  /** エラーメッセージ */
  message: string;

  /** 詳細情報（オプション） */
  details?: unknown;
}

/** Not Found エラー */
@error
model NotFoundError {
  code: "NOT_FOUND";
  message: string;
}

/** Bad Request エラー */
@error
model BadRequestError {
  code: "BAD_REQUEST";
  message: string;
  details?: unknown;
}

/** Conflict エラー */
@error
model ConflictError {
  code: "CONFLICT";
  message: string;
}

/** Forbidden エラー */
@error
model ForbiddenError {
  code: "FORBIDDEN";
  message: string;
}

/** Unauthorized エラー */
@error
model UnauthorizedError {
  code: "UNAUTHORIZED";
  message: string;
}

/** 画像アップロード結果 */
model UploadUrlResponse {
  /** アップロードされたファイルのURL */
  url: string;
}

/** 診断AIレポート（Work Values / Career Interest 共通） */
model AiReportResponse {
  /** レポートID */
  id: string;

  /** セッションID */
  session_id: string;

  /** レポート本文（Markdown） */
  content: string;

  /** 作成日時 */
  created_at: utcDateTime;

  /** 初回閲覧かどうか（このレスポンスで閲覧済みが記録される） */
  first_view: boolean;
}
