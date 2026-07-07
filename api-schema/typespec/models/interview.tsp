import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 面接スロットのステータス */
union InterviewSlotStatus {
  "proposed",
  "selected",
  "rejected",
}

/** 面接のステータス（completed / no_show は将来値） */
union InterviewStatus {
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
}

/** 面接日程提案のステータス（expired は将来値） */
union InterviewProposalStatus {
  "pending",
  "confirmed",
  "expired",
  "cancelled",
}

/** 面接候補日時（提案リクエスト用、RFC3339 文字列） */
model ProposeSlotInput {
  /** 開始日時（RFC3339） */
  startTime: string;

  /** 終了日時（RFC3339） */
  endTime: string;
}

/** 面接日程提案リクエスト */
model ProposeInterviewRequest {
  /** 応募ID */
  applicationId: Uuid;

  /** メッセージ */
  @maxLength(5000)
  message: string;

  /** 場所 */
  @maxLength(255)
  location: string;

  /** 所要時間（分） */
  durationMinutes: integer;

  /** 候補日時（1-10件） */
  @minItems(1)
  @maxItems(10)
  slots: ProposeSlotInput[];

  /** 有効期限（日数） */
  expiresInDays: integer;
}

/** スロット選択リクエスト。slotId 指定か、startTime/endTime の直接指定 */
model SelectSlotRequest {
  /** 選択するスロットID */
  slotId: Uuid;

  /** 直接指定の開始日時（RFC3339、空文字可） */
  startTime: string;

  /** 直接指定の終了日時（RFC3339、空文字可） */
  endTime: string;
}

/** 面接候補スロット */
model InterviewSlotResponse {
  /** スロットID */
  id: Uuid;

  /** 開始日時 */
  startTime: utcDateTime;

  /** 終了日時 */
  endTime: utcDateTime;

  /** ステータス */
  status: InterviewSlotStatus;
}

/** 面接（共通フィールド） */
model InterviewBase {
  /** 面接ID */
  id: Uuid;

  /** 応募ID */
  applicationId: Uuid;

  /** 開始日時 */
  startTime: utcDateTime;

  /** 終了日時 */
  endTime: utcDateTime;

  /** 場所 */
  location: string;

  /** ミーティングURL */
  meetingUrl: string;

  /** ステータス */
  status: InterviewStatus;

  /** タイトル */
  title: string;
}

/** 面接（企業向け・候補者情報付き） */
model CompanyInterviewItem {
  ...InterviewBase;

  /** 候補者名 */
  candidateName: string;

  /** 候補者アバターURL */
  candidateAvatarUrl: string;

  /** 求人タイトル */
  jobTitle: string;
}

/** 面接（候補者向け・企業情報付き） */
model CandidateInterviewItem {
  ...InterviewBase;

  /** 企業名 */
  companyName: string;

  /** 求人タイトル */
  jobTitle: string;
}

/** 企業向け面接一覧 */
model CompanyInterviewListResponse is ItemsResponse<CompanyInterviewItem>;

/** 候補者に届いている日程提案 */
model PendingProposalItem {
  /** 提案ID */
  id: Uuid;

  /** 企業名 */
  companyName: string;

  /** 求人タイトル */
  jobTitle: string;

  /** メッセージ */
  message: string;

  /** 所要時間（分） */
  durationMinutes: integer;

  /** 候補スロット */
  slots: InterviewSlotResponse[];

  /** 有効期限 */
  expiresAt: utcDateTime;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** 候補者向け面接一覧（未回答の提案付き） */
model CandidateInterviewListResponse {
  /** 確定済み面接 */
  interviews: CandidateInterviewItem[];

  /** 未回答の日程提案 */
  pendingProposals: PendingProposalItem[];
}

/** 面接日程提案結果 */
model ProposeInterviewResponse {
  /** 提案ID */
  proposalId: Uuid;

  /** 登録されたスロット */
  slots: InterviewSlotResponse[];
}

/** 確定した面接（スロット選択結果） */
model SelectedInterview {
  /** 面接ID */
  id: Uuid;

  /** 開始日時 */
  startTime: utcDateTime;

  /** 終了日時 */
  endTime: utcDateTime;

  /** ステータス */
  status: InterviewStatus;
}

/** スロット選択結果 */
model SelectSlotResponse {
  /** 確定した面接 */
  interview: SelectedInterview;
}

/** 未回答提案の有無 */
model PendingProposalCheckResponse {
  /** 未回答の提案があるか */
  hasPending: boolean;

  /** 提案ID */
  proposalId?: Uuid;

  /** 提案作成日時 */
  createdAt?: utcDateTime;
}

/** 提案サマリー */
model ProposalSummary {
  /** 提案ID */
  id: Uuid;

  /** メッセージ */
  message: string;

  /** ステータス */
  status: InterviewProposalStatus;

  /** 有効期限 */
  expiresAt: utcDateTime;
}

/** 提案とスロット一覧 */
model ProposalSlotsResponse {
  /** 提案 */
  proposal: ProposalSummary;

  /** 候補スロット */
  slots: InterviewSlotResponse[];
}
