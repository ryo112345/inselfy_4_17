import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** ユーザー作成リクエスト */
model CreateUserRequest {
  /** 表示名（1-100文字） */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** ユーザー名（3-20文字、半角英数字とアンダースコア） */
  @pattern("^[a-zA-Z0-9_]{3,20}$")
  username: string;
}

/** ユーザー情報 */
model UserResponse {
  /** ユーザーID */
  id: string;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 更新日時 */
  updatedAt: utcDateTime;
}
