import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** フォロー関係のユーザー */
model FollowUserResponse {
  /** ユーザーID */
  userId: Uuid;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** アバター画像URL */
  avatarUrl: string | null;

  /** ヘッドライン */
  headline: string | null;

  /** フォロー日時 */
  createdAt: utcDateTime;
}

/** フォロー関係のユーザー一覧 */
model FollowUserListResponse is ListResponse<FollowUserResponse>;

/** フォロー状態 */
model FollowStatusResponse {
  /** 自分が相手をフォローしているか */
  following: boolean;

  /** 相手にフォローされているか */
  followedBy: boolean;
}
