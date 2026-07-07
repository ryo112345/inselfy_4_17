import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

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
  applicationId: string;

  /** メッセージ */
  message: string;

  /** 場所 */
  location: string;

  /** 所要時間（分） */
  durationMinutes: integer;

  /** 候補日時（1-10件） */
  slots: ProposeSlotInput[];

  /** 有効期限（日数） */
  expiresInDays: integer;
}

/** スロット選択リクエスト。slotId 指定か、startTime/endTime の直接指定 */
model SelectSlotRequest {
  /** 選択するスロットID */
  slotId: string;

  /** 直接指定の開始日時（RFC3339、空文字可） */
  startTime: string;

  /** 直接指定の終了日時（RFC3339、空文字可） */
  endTime: string;
}

/** 面接候補スロット */
model InterviewSlotResponse {
  /** スロットID */
  id: string;

  /** 開始日時 */
  startTime: utcDateTime;

  /** 終了日時 */
  endTime: utcDateTime;

  /** ステータス（proposed / selected / rejected） */
  status: string;
}

/** 面接（共通フィールド） */
model InterviewBase {
  /** 面接ID */
  id: string;

  /** 応募ID */
  applicationId: string;

  /** 開始日時 */
  startTime: utcDateTime;

  /** 終了日時 */
  endTime: utcDateTime;

  /** 場所 */
  location: string;

  /** ミーティングURL */
  meetingUrl: string;

  /** ステータス（scheduled / completed / cancelled / no_show） */
  status: string;

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
model CompanyInterviewListResponse {
  /** 面接 */
  items: CompanyInterviewItem[];
}

/** 候補者に届いている日程提案 */
model PendingProposalItem {
  /** 提案ID */
  id: string;

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
  proposalId: string;

  /** 登録されたスロット */
  slots: InterviewSlotResponse[];
}

/** 確定した面接（スロット選択結果） */
model SelectedInterview {
  /** 面接ID */
  id: string;

  /** 開始日時 */
  startTime: utcDateTime;

  /** 終了日時 */
  endTime: utcDateTime;

  /** ステータス */
  status: string;
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
  proposalId?: string;

  /** 提案作成日時 */
  createdAt?: utcDateTime;
}

/** 提案サマリー */
model ProposalSummary {
  /** 提案ID */
  id: string;

  /** メッセージ */
  message: string;

  /** ステータス（pending / confirmed / expired / cancelled） */
  status: string;

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
