import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/**
 * 候補者認証。`inselfy_token` cookie の JWT を検証する
 * （開発用に `Authorization: Bearer` ヘッダーでも代替可）。
 */
model CandidateAuth is ApiKeyAuth<ApiKeyLocation.cookie, "inselfy_token">;

/**
 * 企業認証。`company_token` cookie の JWT を検証する
 * （開発用に `Authorization: Bearer` ヘッダーでも代替可）。
 */
model CompanyAuth is ApiKeyAuth<ApiKeyLocation.cookie, "company_token">;

/** 診断セッションのステータス（Work Values / Career Interest 共通） */
union DiagnosisSessionStatus {
  "in_progress",
  "completed",
  "expired",
}

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
  @statusCode statusCode: 404;
  code: "NOT_FOUND";
  message: string;
}

/** Bad Request エラー */
@error
model BadRequestError {
  @statusCode statusCode: 400;
  code: "BAD_REQUEST";
  message: string;
  details?: unknown;
}

/** Conflict エラー */
@error
model ConflictError {
  @statusCode statusCode: 409;
  code: "CONFLICT";
  message: string;
}

/** Forbidden エラー */
@error
model ForbiddenError {
  @statusCode statusCode: 403;
  code: "FORBIDDEN";
  message: string;
}

/** Unauthorized エラー */
@error
model UnauthorizedError {
  @statusCode statusCode: 401;
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
  sessionId: string;

  /** レポート本文（Markdown） */
  content: string;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 初回閲覧かどうか（このレスポンスで閲覧済みが記録される） */
  firstView: boolean;
}
