import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 類似ユーザーの職歴（要約） */
model SimilarUserExperience {
  /** 会社名 */
  company_name: string;

  /** 役職 */
  title: string;

  /** 現職か */
  is_current: boolean;
}

/** 類似ユーザー */
model SimilarUserItem {
  /** ユーザーID */
  user_id: string;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** ヘッドライン */
  headline: string | null;

  /** アバター画像URL */
  avatar_url: string | null;

  /** プロフィールカラー */
  profile_color: string | null;

  /** 類似度（0-1） */
  similarity: float64;

  /** 上位の Work Needs ID */
  top_needs: string[] | null;

  /** 職歴（現職優先の要約） */
  experiences: SimilarUserExperience[] | null;
}

/** 類似ユーザー一覧 */
model SimilarUsersResponse {
  /** 類似ユーザー（0件時は null） */
  users: SimilarUserItem[] | null;

  /** 件数 */
  total: int32;
}
