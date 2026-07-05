import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** Career Interest セッション開始リクエスト */
model CIStartSessionRequest {
  /** ユーザーID */
  user_id: string;
}

/** Career Interest 回答（1問分） */
model CIResponseItem {
  /** 質問番号 */
  question_number: int32;

  /** 項目コード */
  item_code: string;

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
  question_number: int32;

  /** 項目コード */
  item_code: string;

  /** 基本興味領域ID */
  basic_interest_id: string;

  /** スキルレベル */
  skill_level: string;

  /** 活動種別 */
  activity_type: string;

  /** 設問文（日本語） */
  text_ja: string;
}

/** Career Interest セッション */
model CISessionResponse {
  /** セッションID */
  id: string;

  /** ステータス */
  status: string;

  /** 設問一覧 */
  items: CIItemResponse[];
}

/** 基本興味領域スコア */
model CIBasicScoreResponse {
  /** 基本興味領域ID */
  basic_interest_id: string;

  /** スコア */
  score: float64;

  /** 順位 */
  rank: int32;
}

/** RIASEC タイプスコア */
model CITypeScoreResponse {
  /** タイプID */
  type_id: string;

  /** スコア */
  score: float64;

  /** 順位 */
  rank: int32;
}

/** Career Interest 診断結果 */
model CIResultResponse {
  /** 結果ID */
  id: string;

  /** セッションID */
  session_id: string;

  /** ユーザーID */
  user_id: string;

  /** 基本興味領域スコア */
  basic_scores: CIBasicScoreResponse[];

  /** RIASEC タイプスコア */
  type_scores: CITypeScoreResponse[];

  /** 作成日時（RFC3339 文字列） */
  created_at: string;
}
