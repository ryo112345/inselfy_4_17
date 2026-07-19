import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 企業アカウントのステータス */
union CompanyStatus {
  "pending",
  "approved",
  "rejected",
}

/** 企業アカウント登録リクエスト */
model CompanyRegisterRequest {
  /** メールアドレス */
  @maxLength(255)
  @format("email")
  email: string;

  /** パスワード */
  @minLength(8)
  password: string;

  /** 企業名 */
  @maxLength(200)
  companyName: string;

  /** 担当者名 */
  @maxLength(100)
  contactPersonName: string;

  /** 電話番号 */
  @maxLength(30)
  phoneNumber: string;
}

/**
 * 未承認アカウントでのログイン拒否エラー。
 * 認証情報は正しいが、アカウントが承認待ち（ACCOUNT_PENDING）または
 * 却下済み（ACCOUNT_REJECTED）のためログインできない。
 */
@error
model CompanyAccountStatusError {
  @statusCode statusCode: 403;

  /** エラーコード */
  code: "ACCOUNT_PENDING" | "ACCOUNT_REJECTED";

  /** エラーメッセージ */
  message: string;
}

/** 企業ログインリクエスト */
model CompanyLoginRequest {
  /** メールアドレス */
  email: string;

  /** パスワード */
  password: string;
}

/** 企業アカウント情報（トークンは HttpOnly cookie で返る） */
model CompanyResponse {
  /** 企業ID */
  id: Uuid;

  /** メールアドレス */
  email: string;

  /** 企業名 */
  companyName: string;

  /** 担当者名 */
  contactPersonName: string;

  /** 電話番号 */
  phoneNumber: string;

  /** アカウントステータス */
  status: CompanyStatus;

  /** 作成日時 */
  createdAt: utcDateTime;
}
