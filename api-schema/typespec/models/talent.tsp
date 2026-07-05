import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 人材カードの職歴（要約） */
model TalentExperience {
  /** 会社名 */
  company_name: string;

  /** 役職 */
  title: string;
}

/** 人材カード（検索・保存済み候補者で共通） */
model TalentCard {
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

  /** 求職ステータス */
  job_seeking_status: string | null;

  /** スキル */
  skills: string[];

  /** 職歴 */
  experiences: TalentExperience[];

  /** Work Values 上位ラベル */
  top_wv_labels: string[];

  /** Career Interest 上位ラベル */
  top_ci_labels: string[];

  /** 類似度 */
  similarity?: float64;

  /** Work Values 類似度 */
  wv_similarity?: float64;

  /** Career Interest 類似度 */
  ci_similarity?: float64;

  /** 統合類似度 */
  integrated_similarity?: float64;
}

/** 人材一覧 */
model TalentListResponse {
  /** 人材カード */
  users: TalentCard[];

  /** 総件数 */
  total: integer;
}

/** 保存済み候補者一括チェックリクエスト */
model BulkCheckSavedRequest {
  /** ユーザーID一覧 */
  user_ids: string[];
}

/** 保存済み判定 */
model SavedResponse {
  /** 保存済みか */
  saved: boolean;
}

/** 保存済み一括判定（ユーザーID → 保存済みか） */
model BulkSavedResponse {
  /** 判定結果 */
  saved: Record<boolean>;
}

/** 保存済み候補者数 */
model SavedCountResponse {
  /** 件数 */
  count: integer;
}
