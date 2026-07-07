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
  email: string;

  /** パスワード */
  password: string;

  /** 企業名 */
  companyName: string;

  /** 担当者名 */
  contactPersonName: string;

  /** 電話番号 */
  phoneNumber: string;
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
  id: string;

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
