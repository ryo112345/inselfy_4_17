import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** スカウト送信リクエスト */
model SendScoutRequest {
  /** 候補者ユーザーID */
  candidateId: string;

  /** 関連求人ID */
  jobPostingId?: string | null;

  /** 使用テンプレートID */
  templateId?: string | null;

  /** 件名 */
  subject: string;

  /** 本文 */
  body: string;
}

/** 企業からのスカウト返信リクエスト */
model CompanyScoutReplyRequest {
  /** 本文 */
  body: string;
}

/** スカウトメッセージ */
model ScoutMessageResponse {
  /** スカウトID */
  id: string;

  /** 企業ID */
  companyId: string;

  /** 候補者ユーザーID */
  candidateId: string;

  /** 関連求人ID */
  jobPostingId: string | null;

  /** 件名 */
  subject: string;

  /** 本文 */
  body: string;

  /** ステータス */
  status: string;

  /** 企業名 */
  companyName: string;

  /** 候補者名 */
  candidateName: string;

  /** 求人タイトル */
  jobTitle: string | null;

  /** 送信日時 */
  sentAt: utcDateTime | null;

  /** 開封日時 */
  openedAt: utcDateTime | null;

  /** 返信日時 */
  repliedAt: utcDateTime | null;

  /** 期限 */
  expiresAt: utcDateTime | null;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** スカウト返信 */
model ScoutReplyResponse {
  /** 返信ID */
  id: string;

  /** 送信者種別（company / candidate） */
  senderType: string;

  /** 送信者ID */
  senderId: string;

  /** 本文 */
  body: string;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** スカウト詳細（メッセージ + 返信スレッド） */
model ScoutDetailResponse {
  /** スカウトメッセージ */
  message: ScoutMessageResponse;

  /** 返信一覧（0件時は空配列） */
  replies: ScoutReplyResponse[];
}

/** スカウト一覧 */
model ScoutListResponse {
  /** スカウト */
  items: ScoutMessageResponse[];

  /** 総件数 */
  total: integer;
}

/** スカウトクレジット */
model ScoutCreditsResponse {
  /** 残高 */
  balance: integer;

  /** 月次補充量 */
  monthlyAllowance: integer;

  /** 最大ストック */
  maxStock: integer;

  /** 最終補充日時 */
  lastReplenishedAt: utcDateTime;
}

/** スカウト品質スコア */
model ScoutQualityScoreResponse {
  /** 直近14日の返信率 */
  replyRate14d: float64;

  /** 品質レベル */
  level: string;

  /** 直近14日の送信数 */
  sentLast14d: integer;

  /** 直近14日の返信数 */
  repliedLast14d: integer;

  /** 警告開始日時 */
  warningStartedAt?: utcDateTime;

  /** 警告期限 */
  warningDeadline?: utcDateTime;

  /** 残り日数 */
  daysRemaining?: integer;

  /** 制限解除日時 */
  restrictionEndsAt?: utcDateTime;
}

/** ダッシュボード: クレジット */
model ScoutDashboardCredits {
  /** 残高 */
  balance: integer;

  /** 最大ストック */
  maxStock: integer;

  /** 月次補充量 */
  monthlyAllowance: integer;

  /** 次回補充日 */
  nextReplenishDate: utcDateTime;
}

/** ダッシュボード: 月別未返信 */
model ScoutDashboardPendingByMonth {
  /** 送信月（YYYY-MM） */
  month: string;

  /** 件数 */
  count: integer;

  /** 期限までの残日数 */
  daysLeft: integer;
}

/** ダッシュボード: 未返信 */
model ScoutDashboardPending {
  /** 総件数 */
  total: integer;

  /** 月別内訳 */
  byMonth: ScoutDashboardPendingByMonth[];
}

/** スカウトダッシュボード */
model ScoutDashboardResponse {
  /** クレジット状況 */
  credits: ScoutDashboardCredits;

  /** 未返信状況 */
  pending: ScoutDashboardPending;

  /** 返信率 */
  replyRate: float64;

  /** 平均返信日数 */
  avgReplyDays: float64;

  /** 直近90日の送信数 */
  sentLast90d: integer;
}
