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
