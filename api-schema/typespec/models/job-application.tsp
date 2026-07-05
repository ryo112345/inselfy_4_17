import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 求人応募リクエスト */
model ApplyJobRequest {
  /** 求人ID */
  jobPostingId: string;

  /** 応募メッセージ */
  message: string;
}

/** 応募ステータス更新リクエスト */
model UpdateApplicationStatusRequest {
  /** 新しいステータス */
  status: string;
}

/** 応募（詳細付き） */
model JobApplicationResponse {
  /** 応募ID */
  id: string;

  /** 求人ID */
  jobPostingId: string;

  /** 候補者ユーザーID */
  candidateId: string;

  /** 企業ID */
  companyId: string;

  /** ステータス */
  status: string;

  /** 応募メッセージ */
  message: string;

  /** 求人タイトル */
  jobTitle: string;

  /** 企業名 */
  companyName: string;

  /** 候補者名 */
  candidateName: string;

  /** 候補者アバターURL */
  candidateAvatar: string;

  /** 候補者ユーザー名 */
  candidateUsername: string;

  /** 候補者ヘッドライン */
  candidateHeadline: string;

  /** 候補者プロフィールカラー */
  candidateProfileColor?: string;

  /** 候補者の求職ステータス */
  candidateSeekingStatus?: string;

  /** 候補者スキル */
  candidateSkills?: string[];

  /** Work Values 類似度 */
  wvSimilarity?: float64;

  /** Career Interest 類似度 */
  ciSimilarity?: float64;

  /** 統合類似度 */
  integratedSimilarity?: float64;

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 更新日時 */
  updatedAt: utcDateTime;
}

/** 応募一覧 */
model JobApplicationListResponse {
  /** 応募 */
  items: JobApplicationResponse[];

  /** 総件数 */
  total: integer;
}

/** 応募済み判定 */
model AppliedResponse {
  /** 応募済みか */
  applied: boolean;
}

/** 汎用 OK レスポンス */
model StatusOkResponse {
  /** 処理結果（"ok"） */
  status: string;
}
