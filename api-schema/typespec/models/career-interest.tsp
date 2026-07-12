import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 設問のスキルレベル */
union CISkillLevel {
  "entry",
  "mid",
  "advanced",
}

/** Career Interest 回答（1問分） */
model CIResponseItem {
  /** 質問番号 */
  questionNumber: int32;

  /** 項目コード */
  itemCode: string;

  /** 回答スコア */
  score: int32;
}

/** Career Interest 結果送信リクエスト */
model CISubmitResultRequest {
  /** 回答一覧 */
  responses: CIResponseItem[];
}

/** Career Interest 設問 */
model CIItemResponse {
  /** 質問番号 */
  questionNumber: int32;

  /** 項目コード */
  itemCode: string;

  /** 基本興味領域ID */
  basicInterestId: string;

  /** スキルレベル */
  skillLevel: CISkillLevel;

  /** 活動種別 */
  activityType: string;

  /** 設問文（日本語） */
  textJa: string;
}

/** Career Interest セッション */
model CISessionResponse {
  /** セッションID */
  id: Uuid;

  /** ステータス */
  status: DiagnosisSessionStatus;

  /** 設問一覧 */
  items: CIItemResponse[];
}

/** 基本興味領域スコア */
model CIBasicScoreResponse {
  /** 基本興味領域ID */
  basicInterestId: string;

  /** スコア */
  score: float64;

  /** 順位 */
  rank: int32;
}

/** RIASEC タイプスコア */
model CITypeScoreResponse {
  /** タイプID */
  typeId: string;

  /** スコア */
  score: float64;

  /** 順位 */
  rank: int32;
}

/** Career Interest 診断結果 */
model CIResultResponse {
  /** 結果ID */
  id: Uuid;

  /** セッションID */
  sessionId: Uuid;

  /** ユーザーID */
  userId: Uuid;

  /** 基本興味領域スコア */
  basicScores: CIBasicScoreResponse[];

  /** RIASEC タイプスコア */
  typeScores: CITypeScoreResponse[];

  /** このセッションのAIレポートが生成済みかどうか */
  hasReport: boolean;

  /** このセッションのAIレポート作成依頼が済んでいるかどうか */
  reportRequested: boolean;

  /** 作成日時（RFC3339 文字列） */
  createdAt: string;
}
