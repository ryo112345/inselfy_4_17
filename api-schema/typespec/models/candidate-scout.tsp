import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** スカウトへの応答リクエスト（interested / declined） */
model ScoutRespondRequest {
  /** 応答種別 */
  response: string;
}

/** 候補者からのスカウト返信リクエスト */
model CandidateScoutReplyRequest {
  /** 本文 */
  @maxLength(5000)
  body: string;
}

/** スカウト一括辞退リクエスト */
model BulkDeclineRequest {
  /** スカウトID一覧 */
  scoutIds: string[];
}

/** スカウト一括応答リクエスト */
model BulkRespondRequest {
  /** スカウトID一覧 */
  scoutIds: string[];

  /** 応答種別（interested / declined） */
  response: string;
}

/** スカウト応答結果 */
model ScoutRespondResponse {
  /** 処理結果（"ok"） */
  status: "ok";

  /** 応答により作成・特定された会話ID */
  conversationId?: Uuid;
}
