import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** Work Values 一対比較の回答（1問分） */
model WVResponseItem {
  /** ニーズA */
  needA: string;

  /** ニーズB */
  needB: string;

  /** 勝者（needA か needB の ID） */
  winner: string;

  /** 質問番号 */
  questionNumber: int32;
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
  needA: string;

  /** ニーズB */
  needB: string;
}

/** Work Need 定義 */
model WVNeedDefResponse {
  /** ニーズID */
  id: string;

  /** ラベル */
  label: string;

  /** 説明（日本語） */
  descriptionJa: string;
}

/** Work Values セッション */
model WVSessionResponse {
  /** セッションID */
  id: Uuid;

  /** ステータス */
  status: DiagnosisSessionStatus;

  /** 初期ペア */
  initialPairs: WVPairResponse[];

  /** ニーズ定義一覧 */
  needs: WVNeedDefResponse[];
}

/** Work Need スコア */
model WVNeedScore {
  /** ニーズID */
  needId: string;

  /** ラベル */
  label: string;

  /** 説明（日本語） */
  descriptionJa: string;

  /** 表示スコア（0-100） */
  displayScore: float64;

  /** 順位 */
  rank: int32;
}

/** Work Value スコア */
model WVValueScoreResponse {
  /** Value ID */
  valueId: string;

  /** 表示スコア（0-100） */
  displayScore: float64;

  /** 順位 */
  rank: int32;
}

/** Work Values 診断結果 */
model WVResultResponse {
  /** 結果ID */
  id: Uuid;

  /** セッションID */
  sessionId: Uuid;

  /** ユーザーID */
  userId: Uuid;

  /** ニーズスコア（スコア降順） */
  needs: WVNeedScore[];

  /** Value スコア */
  values: WVValueScoreResponse[];

  /** このセッションのAIレポートが生成済みかどうか */
  hasReport: boolean;

  /** 作成日時（RFC3339 文字列） */
  createdAt: string;
}
