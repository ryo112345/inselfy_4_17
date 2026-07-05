import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** Work Values セッション開始リクエスト */
model WVStartSessionRequest {
  /** ユーザーID */
  user_id: string;
}

/** Work Values 一対比較の回答（1問分） */
model WVResponseItem {
  /** ニーズA */
  need_a: string;

  /** ニーズB */
  need_b: string;

  /** 勝者（need_a か need_b の ID） */
  winner: string;

  /** 質問番号 */
  question_number: int32;
}

/** Work Values 結果送信リクエスト */
model WVSubmitResultRequest {
  /** 回答一覧 */
  responses: WVResponseItem[];

  /** フロント推定の μ（ニーズID → 値） */
  mu: Record<float64>;

  /** フロント推定の SE（ニーズID → 値） */
  se: Record<float64>;
}

/** 一対比較ペア */
model WVPairResponse {
  /** ニーズA */
  need_a: string;

  /** ニーズB */
  need_b: string;
}

/** Work Need 定義 */
model WVNeedDefResponse {
  /** ニーズID */
  id: string;

  /** ラベル */
  label: string;

  /** 説明（日本語） */
  description_ja: string;
}

/** Work Values セッション */
model WVSessionResponse {
  /** セッションID */
  id: string;

  /** ステータス */
  status: string;

  /** 初期ペア */
  initial_pairs: WVPairResponse[];

  /** ニーズ定義一覧 */
  needs: WVNeedDefResponse[];
}

/** Work Need スコア */
model WVNeedScore {
  /** ニーズID */
  need_id: string;

  /** ラベル */
  label: string;

  /** 説明（日本語） */
  description_ja: string;

  /** 表示スコア（0-100） */
  display_score: float64;

  /** 順位 */
  rank: int32;
}

/** Work Value スコア */
model WVValueScoreResponse {
  /** Value ID */
  value_id: string;

  /** 表示スコア（0-100） */
  display_score: float64;

  /** 順位 */
  rank: int32;
}

/** Work Values 診断結果 */
model WVResultResponse {
  /** 結果ID */
  id: string;

  /** セッションID */
  session_id: string;

  /** ユーザーID */
  user_id: string;

  /** ニーズスコア（スコア降順） */
  needs: WVNeedScore[];

  /** Value スコア */
  values: WVValueScoreResponse[];

  /** 作成日時（RFC3339 文字列） */
  created_at: string;
}
