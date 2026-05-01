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

/** プロフィール更新リクエスト（PATCH。指定したキーのみ差分適用）。値に null を渡すとフィールドをクリア。 */
model UpdateUserProfileRequest {
  /** 表示名 */
  @minLength(1)
  @maxLength(100)
  name?: string;

  /** ヘッドライン（肩書き・一言） */
  @maxLength(255)
  headline?: string | null;

  /** 居住地 */
  @maxLength(100)
  location?: string | null;

  /** 自己紹介 */
  @maxLength(2000)
  about?: string | null;

  /** 業界 */
  @maxLength(100)
  industry?: string | null;

  /** 職種タグ */
  @maxLength(50)
  jobType?: string | null;

  /** 求職ステータス */
  @maxLength(50)
  jobSeekingStatus?: string | null;

  /** プロフィールカラー（`#RRGGBB`） */
  @pattern("^#[0-9A-Fa-f]{6}$")
  profileColor?: string | null;

  /** プロフィール公開フラグ */
  isPublic?: boolean;
}

/** ユーザー情報 */
model UserResponse {
  /** ユーザーID */
  id: string;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** ヘッドライン */
  headline?: string | null;

  /** 居住地 */
  location?: string | null;

  /** 自己紹介 */
  about?: string | null;

  /** 業界 */
  industry?: string | null;

  /** 職種 */
  jobType?: string | null;

  /** 求職ステータス */
  jobSeekingStatus?: string | null;

  /** プロフィールカラー */
  profileColor?: string | null;

  /** 公開フラグ */
  isPublic: boolean;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 更新日時 */
  updatedAt: utcDateTime;
}
