import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** チーム作成リクエスト */
model CreateTeamRequest {
  /** チーム名 */
  name: string;

  /** 説明 */
  description?: string | null;
}

/** チーム更新リクエスト */
model UpdateTeamRequest {
  /** チーム名 */
  name: string;

  /** 説明 */
  description?: string | null;

  /** 公開フラグ（未指定なら変更しない） */
  is_public?: boolean | null;
}

/** チームメンバー追加リクエスト */
model AddTeamMemberRequest {
  /** メンバー名 */
  name: string;

  /** 招待メールアドレス */
  email?: string | null;
}

/** チーム（サマリー） */
model TeamResponse {
  /** チームID */
  id: string;

  /** 企業ID */
  company_id: string;

  /** チーム名 */
  name: string;

  /** 説明 */
  description: string | null;

  /** 公開フラグ */
  is_public: boolean;

  /** メンバー数 */
  member_count: integer;

  /** Work Values 完了数 */
  wv_completed: integer;

  /** Career Interest 完了数 */
  ci_completed: integer;

  /** 作成日時（RFC3339 文字列） */
  created_at: string;
}

/** チーム一覧 */
model TeamListResponse {
  /** チーム */
  teams: TeamResponse[];
}

/** チームメンバー */
model TeamMemberResponse {
  /** メンバーID */
  id: string;

  /** メンバー名 */
  name: string;

  /** 招待メールアドレス */
  email: string | null;

  /** 診断招待トークン */
  invite_token: string;

  /** Work Values 診断ステータス */
  wv_status: string;

  /** Career Interest 診断ステータス */
  ci_status: string;

  /** エースメンバーか */
  is_ace: boolean;

  /** 作成日時（RFC3339 文字列） */
  created_at: string;
}

/** チーム詳細（メンバー付き） */
model TeamDetailResponse {
  /** チームID */
  id: string;

  /** 企業ID */
  company_id: string;

  /** チーム名 */
  name: string;

  /** 説明 */
  description: string | null;

  /** 公開フラグ */
  is_public: boolean;

  /** メンバー一覧 */
  members: TeamMemberResponse[];

  /** 作成日時（RFC3339 文字列） */
  created_at: string;
}

/** 診断スコア（ID・表示スコア・順位） */
model TeamScoreEntry {
  /** スコアID（need/value/type） */
  id: string;

  /** 表示スコア */
  display_score: float64;

  /** 順位 */
  rank: integer;
}

/** メンバーごとの診断スコア */
model MemberScoreResponse {
  /** メンバーID */
  member_id: string;

  /** メンバー名 */
  member_name: string;

  /** 紐づくユーザーID */
  user_id: string;

  /** Work Values 診断ステータス */
  wv_status: string;

  /** Career Interest 診断ステータス */
  ci_status: string;

  /** エースメンバーか */
  is_ace: boolean;

  /** Work Values スコア */
  wv_scores?: TeamScoreEntry[];

  /** Career Interest スコア */
  ci_scores?: TeamScoreEntry[];
}

/** チームスコア一覧 */
model TeamScoresResponse {
  /** メンバーごとのスコア */
  members: MemberScoreResponse[];
}

/** 公開スコアエントリ */
model PublicScoreEntry {
  /** スコアID */
  id: string;

  /** 集計スコア */
  score: float64;
}

/** チームの公開集計スコア */
model PublicTeamScoreResponse {
  /** チームID */
  team_id: string;

  /** チーム名 */
  team_name: string;

  /** Work Values 集計（完了者不足時は null） */
  wv_scores: PublicScoreEntry[] | null;

  /** Work Needs 集計（完了者不足時は null） */
  wn_scores: PublicScoreEntry[] | null;

  /** Career Interest 集計（完了者不足時は null） */
  ci_scores: PublicScoreEntry[] | null;

  /** メンバー数 */
  member_count: integer;

  /** 診断完了者数 */
  completed_count: integer;
}

/** 公開チームスコア一覧 */
model PublicTeamScoresResponse {
  /** チーム */
  teams: PublicTeamScoreResponse[];
}
