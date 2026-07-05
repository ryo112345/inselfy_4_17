import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 会話開始リクエスト（企業→候補者） */
model StartConversationRequest {
  /** 候補者ユーザーID */
  candidateId: string;

  /** 最初のメッセージ本文 */
  body: string;
}

/** 会話開始リクエスト（候補者→候補者/企業） */
model StartCandidateConversationRequest {
  /** 相手のID */
  recipientId: string;

  /** 最初のメッセージ本文 */
  body: string;
}

/** メッセージ送信リクエスト */
model SendMessageRequest {
  /** 本文 */
  body: string;
}

/** 会話（プレビュー付き） */
model ConversationResponse {
  /** 会話ID */
  id: string;

  /** 会話種別 */
  conversationType: string;

  /** 企業ID */
  companyId: string;

  /** 候補者ユーザーID */
  candidateId: string;

  /** 企業名 */
  companyName: string;

  /** 候補者名 */
  candidateName: string;

  /** 参加者1 ID（ユーザー間会話のみ） */
  participant1Id?: string;

  /** 参加者2 ID（ユーザー間会話のみ） */
  participant2Id?: string;

  /** 参加者1 名（ユーザー間会話のみ） */
  participant1Name?: string;

  /** 参加者2 名（ユーザー間会話のみ） */
  participant2Name?: string;

  /** 最新メッセージ本文 */
  lastMessageBody: string | null;

  /** 最新メッセージ日時 */
  lastMessageAt: utcDateTime;

  /** 未読数 */
  unreadCount: integer;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** 会話一覧 */
model ConversationListResponse {
  /** 会話 */
  items: ConversationResponse[];

  /** 総件数 */
  total: integer;
}

/** メッセージ */
model MessageResponse {
  /** メッセージID */
  id: string;

  /** 会話ID */
  conversationId: string;

  /** 送信者種別（company / candidate） */
  senderType: string;

  /** 送信者ID */
  senderId: string;

  /** 本文 */
  body: string;

  /** メッセージ種別（text 等） */
  messageType: string;

  /** 付加情報 */
  metadata?: Record<unknown>;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** メッセージ一覧 */
model MessageListResponse {
  /** メッセージ */
  items: MessageResponse[];

  /** 総件数 */
  total: integer;
}
