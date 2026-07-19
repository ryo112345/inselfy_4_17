// WebSocket 駆動の命令的な再取得フロー（MessagesPageContent / company/messages）から
// 呼ばれる薄いラッパー層。分類F（変則）のため React Query 化はせず、内部だけ
// orval 生成の平関数に置き換えている。非2xx は mutator が ApiError を throw する。
import { skipAuthRedirect } from "@/external/client/api/orval/custom-fetch";
import {
  candidateMessagingCountCandidateUnreadMessages,
  candidateMessagingListCandidateConversations,
  candidateMessagingListCandidateMessages,
  candidateMessagingMarkCandidateConversationRead,
  candidateMessagingSendCandidateMessage,
  candidateMessagingStartCandidateConversation,
  companyMessagingCountCompanyUnreadMessages,
  companyMessagingListCompanyConversations,
  companyMessagingListCompanyMessages,
  companyMessagingMarkCompanyConversationRead,
  companyMessagingSendCompanyMessage,
  companyMessagingStartCompanyConversation,
} from "@/external/client/api/orval/generated/endpoints/messaging/messaging";
import type {
  Conversation,
  ConversationListResponse,
  Message,
  MessageListResponse,
  UnreadCountResponse,
} from "./types";

function buildListQuery(params?: { limit?: number; offset?: number }) {
  const query: { limit?: number; offset?: number } = {};
  if (params?.limit) query.limit = params.limit;
  if (params?.offset) query.offset = params.offset;
  return query;
}

// ---------------------------------------------------------------------------
// Company side
// ---------------------------------------------------------------------------

export async function startConversation(body: {
  candidateId: string;
  body: string;
}): Promise<Conversation> {
  return (await companyMessagingStartCompanyConversation(body)) as Conversation;
}

export async function fetchCompanyConversations(params?: {
  limit?: number;
  offset?: number;
}): Promise<ConversationListResponse> {
  return (await companyMessagingListCompanyConversations(
    buildListQuery(params),
  )) as ConversationListResponse;
}

export async function fetchCompanyConversationMessages(
  conversationId: string,
  params?: { limit?: number; offset?: number },
): Promise<MessageListResponse> {
  return (await companyMessagingListCompanyMessages(
    conversationId,
    buildListQuery(params),
  )) as MessageListResponse;
}

export async function sendMessageAsCompany(conversationId: string, body: string): Promise<Message> {
  return (await companyMessagingSendCompanyMessage(conversationId, { body })) as Message;
}

export async function markReadAsCompany(conversationId: string): Promise<void> {
  await companyMessagingMarkCompanyConversationRead(conversationId);
}

// 未読バッジのベストエフォート取得。未ログインの 401 で /login に飛ばさない
export async function fetchCompanyUnreadCount(): Promise<UnreadCountResponse> {
  return companyMessagingCountCompanyUnreadMessages(skipAuthRedirect);
}

// ---------------------------------------------------------------------------
// Candidate side
// ---------------------------------------------------------------------------

export async function startCandidateConversation(body: {
  recipientId: string;
  body: string;
}): Promise<Conversation> {
  return (await candidateMessagingStartCandidateConversation(body)) as Conversation;
}

export async function fetchCandidateConversations(params?: {
  limit?: number;
  offset?: number;
}): Promise<ConversationListResponse> {
  return (await candidateMessagingListCandidateConversations(
    buildListQuery(params),
  )) as ConversationListResponse;
}

export async function fetchCandidateConversationMessages(
  conversationId: string,
  params?: { limit?: number; offset?: number },
): Promise<MessageListResponse> {
  return (await candidateMessagingListCandidateMessages(
    conversationId,
    buildListQuery(params),
  )) as MessageListResponse;
}

export async function sendMessageAsCandidate(
  conversationId: string,
  body: string,
): Promise<Message> {
  return (await candidateMessagingSendCandidateMessage(conversationId, { body })) as Message;
}

export async function markReadAsCandidate(conversationId: string): Promise<void> {
  await candidateMessagingMarkCandidateConversationRead(conversationId);
}

// 未読バッジのベストエフォート取得。未ログインの 401 で /login に飛ばさない
export async function fetchCandidateUnreadCount(): Promise<UnreadCountResponse> {
  return candidateMessagingCountCandidateUnreadMessages(skipAuthRedirect);
}
