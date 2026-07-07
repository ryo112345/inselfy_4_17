import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** Google ログインリクエスト */
model GoogleLoginRequest {
  /** Google ID トークン */
  @minLength(1)
  @maxLength(10000)
  idToken: string;
}

/** 認証ユーザー情報（トークンは HttpOnly cookie で返る） */
model AuthUserResponse {
  /** ユーザーID */
  id: Uuid;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** アバター画像URL */
  avatarUrl?: string;

  /** メールアドレス */
  email?: string;

  /** 初期セットアップが必要か（自動生成ユーザー名のまま） */
  needsSetup: boolean;

  /** 作成日時 */
  createdAt: utcDateTime;
}
