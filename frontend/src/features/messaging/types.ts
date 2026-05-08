export interface Conversation {
  id: string;
  conversationType: "company_candidate" | "candidate_candidate";
  companyId: string;
  candidateId: string;
  companyName: string;
  candidateName: string;
  participant1Id?: string;
  participant2Id?: string;
  participant1Name?: string;
  participant2Name?: string;
  lastMessageBody: string | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

export function getCounterpartName(conv: Conversation, myUserId: string): string {
  if (conv.conversationType === "candidate_candidate") {
    if (conv.participant1Id === myUserId) return conv.participant2Name ?? "";
    return conv.participant1Name ?? "";
  }
  return conv.companyName;
}

export interface ConversationListResponse {
  items: Conversation[];
  total: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: "candidate" | "company" | "system";
  senderId: string;
  body: string;
  createdAt: string;
}

export interface MessageListResponse {
  items: Message[];
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}

export type WSMessage =
  | { type: "new_message"; payload: Message }
  | { type: "typing"; payload: { conversationId: string; senderType: string } }
  | { type: "read"; payload: { conversationId: string } };
