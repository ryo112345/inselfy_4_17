import "@/external/client/api/client";
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
} from "@/external/client/api/generated";
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
  const { data, error } = await companyMessagingStartCompanyConversation({ body });
  if (error || !data) {
    throw new Error(error?.message ?? "会話の開始に失敗しました");
  }
  return data as Conversation;
}

export async function fetchCompanyConversations(
  params?: { limit?: number; offset?: number },
): Promise<ConversationListResponse> {
  const { data, error } = await companyMessagingListCompanyConversations({
    query: buildListQuery(params),
  });
  if (error || !data) throw new Error("会話一覧の取得に失敗しました");
  return data as ConversationListResponse;
}

export async function fetchCompanyConversationMessages(
  conversationId: string,
  params?: { limit?: number; offset?: number },
): Promise<MessageListResponse> {
  const { data, error } = await companyMessagingListCompanyMessages({
    path: { conversationId },
    query: buildListQuery(params),
  });
  if (error || !data) throw new Error("メッセージの取得に失敗しました");
  return data as MessageListResponse;
}

export async function sendMessageAsCompany(
  conversationId: string,
  body: string,
): Promise<Message> {
  const { data, error } = await companyMessagingSendCompanyMessage({
    path: { conversationId },
    body: { body },
  });
  if (error || !data) {
    throw new Error(error?.message ?? "メッセージの送信に失敗しました");
  }
  return data as Message;
}

export async function markReadAsCompany(
  conversationId: string,
): Promise<void> {
  await companyMessagingMarkCompanyConversationRead({
    path: { conversationId },
  });
}

export async function fetchCompanyUnreadCount(): Promise<UnreadCountResponse> {
  const { data, error } = await companyMessagingCountCompanyUnreadMessages({});
  if (error || !data) return { count: 0 };
  return data;
}

// ---------------------------------------------------------------------------
// Candidate side
// ---------------------------------------------------------------------------

export async function startCandidateConversation(body: {
  recipientId: string;
  body: string;
}): Promise<Conversation> {
  const { data, error } = await candidateMessagingStartCandidateConversation({ body });
  if (error || !data) {
    throw new Error(error?.message ?? "会話の開始に失敗しました");
  }
  return data as Conversation;
}

export async function fetchCandidateConversations(
  params?: { limit?: number; offset?: number },
): Promise<ConversationListResponse> {
  const { data, error } = await candidateMessagingListCandidateConversations({
    query: buildListQuery(params),
  });
  if (error || !data) throw new Error("会話一覧の取得に失敗しました");
  return data as ConversationListResponse;
}

export async function fetchCandidateConversationMessages(
  conversationId: string,
  params?: { limit?: number; offset?: number },
): Promise<MessageListResponse> {
  const { data, error } = await candidateMessagingListCandidateMessages({
    path: { conversationId },
    query: buildListQuery(params),
  });
  if (error || !data) throw new Error("メッセージの取得に失敗しました");
  return data as MessageListResponse;
}

export async function sendMessageAsCandidate(
  conversationId: string,
  body: string,
): Promise<Message> {
  const { data, error } = await candidateMessagingSendCandidateMessage({
    path: { conversationId },
    body: { body },
  });
  if (error || !data) {
    throw new Error(error?.message ?? "メッセージの送信に失敗しました");
  }
  return data as Message;
}

export async function markReadAsCandidate(
  conversationId: string,
): Promise<void> {
  await candidateMessagingMarkCandidateConversationRead({
    path: { conversationId },
  });
}

export async function fetchCandidateUnreadCount(): Promise<UnreadCountResponse> {
  const { data, error } = await candidateMessagingCountCandidateUnreadMessages({});
  if (error || !data) return { count: 0 };
  return data;
}
