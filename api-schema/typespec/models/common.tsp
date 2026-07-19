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

/**
 * 管理者認証。`X-Admin-Key` ヘッダーを静的ブートストラップキー
 * （ADMIN_API_KEY）または admins テーブルの個人トークンと照合する。
 */
model AdminAuth is ApiKeyAuth<ApiKeyLocation.header, "X-Admin-Key">;

/** UUID 形式の識別子 */
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
scalar Uuid extends string;

/** 診断セッションのステータス（Work Values / Career Interest 共通） */
union DiagnosisSessionStatus {
  "in_progress",
  "completed",
  "expired",
}

/** ページング付きリストレスポンスの共通形（items + total） */
model ListResponse<Item> {
  /** アイテム一覧 */
  items: Item[];

  /** 総件数 */
  @minValue(0)
  total: int32;
}

/** 総件数を持たない単純リストレスポンス */
model ItemsResponse<Item> {
  /** アイテム一覧 */
  items: Item[];
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

/** 認証付きエンドポイントの基本エラー（400/401） */
alias AuthedErrors = BadRequestError | UnauthorizedError;

/** 認証付きリソース参照系のエラー（400/401/404） */
alias AuthedNotFoundErrors = NotFoundError | AuthedErrors;

/** 認可チェックを伴う操作のエラー（400/401/403/404） */
alias AuthedForbiddenErrors = ForbiddenError | AuthedNotFoundErrors;

/** 重複・競合が起こりうる操作のエラー（400/401/404/409） */
alias AuthedConflictErrors = ConflictError | AuthedNotFoundErrors;

/** 認可チェックと重複・競合の両方を伴う操作のエラー（400/401/403/404/409） */
alias AuthedForbiddenConflictErrors = ForbiddenError | AuthedConflictErrors;

/** 認証エラーを含まないリソース参照系のエラー（400/404） */
alias NotFoundErrors = NotFoundError | BadRequestError;

/** 画像アップロード結果 */
model UploadUrlResponse {
  /** アップロードされたファイルのURL */
  url: string;
}

/** 診断AIレポート（Work Values / Career Interest 共通） */
model AiReportResponse {
  /** レポートID */
  id: Uuid;

  /** セッションID */
  sessionId: Uuid;

  /** レポート本文（Markdown） */
  content: string;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 初回閲覧かどうか（このレスポンスで閲覧済みが記録される） */
  firstView: boolean;
}
