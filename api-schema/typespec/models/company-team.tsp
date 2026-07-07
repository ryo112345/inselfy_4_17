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
  isPublic?: boolean | null;
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
  companyId: string;

  /** チーム名 */
  name: string;

  /** 説明 */
  description: string | null;

  /** 公開フラグ */
  isPublic: boolean;

  /** メンバー数 */
  memberCount: integer;

  /** Work Values 完了数 */
  wvCompleted: integer;

  /** Career Interest 完了数 */
  ciCompleted: integer;

  /** 作成日時（RFC3339 文字列） */
  createdAt: string;
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
  inviteToken: string;

  /** Work Values 診断ステータス */
  wvStatus: string;

  /** Career Interest 診断ステータス */
  ciStatus: string;

  /** エースメンバーか */
  isAce: boolean;

  /** 作成日時（RFC3339 文字列） */
  createdAt: string;
}

/** チーム詳細（メンバー付き） */
model TeamDetailResponse {
  /** チームID */
  id: string;

  /** 企業ID */
  companyId: string;

  /** チーム名 */
  name: string;

  /** 説明 */
  description: string | null;

  /** 公開フラグ */
  isPublic: boolean;

  /** メンバー一覧 */
  members: TeamMemberResponse[];

  /** 作成日時（RFC3339 文字列） */
  createdAt: string;
}

/** 診断スコア（ID・表示スコア・順位） */
model TeamScoreEntry {
  /** スコアID（need/value/type） */
  id: string;

  /** 表示スコア */
  displayScore: float64;

  /** 順位 */
  rank: integer;
}

/** メンバーごとの診断スコア */
model MemberScoreResponse {
  /** メンバーID */
  memberId: string;

  /** メンバー名 */
  memberName: string;

  /** 紐づくユーザーID */
  userId: string;

  /** Work Values 診断ステータス */
  wvStatus: string;

  /** Career Interest 診断ステータス */
  ciStatus: string;

  /** エースメンバーか */
  isAce: boolean;

  /** Work Values スコア */
  wvScores?: TeamScoreEntry[];

  /** Career Interest スコア */
  ciScores?: TeamScoreEntry[];
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
  teamId: string;

  /** チーム名 */
  teamName: string;

  /** Work Values 集計（完了者不足時は null） */
  wvScores: PublicScoreEntry[] | null;

  /** Work Needs 集計（完了者不足時は null） */
  wnScores: PublicScoreEntry[] | null;

  /** Career Interest 集計（完了者不足時は null） */
  ciScores: PublicScoreEntry[] | null;

  /** メンバー数 */
  memberCount: integer;

  /** 診断完了者数 */
  completedCount: integer;
}

/** 公開チームスコア一覧 */
model PublicTeamScoresResponse {
  /** チーム */
  teams: PublicTeamScoreResponse[];
}
