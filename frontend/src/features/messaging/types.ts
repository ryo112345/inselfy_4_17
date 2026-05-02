export interface Conversation {
  id: string;
  companyId: string;
  candidateId: string;
  companyName: string;
  candidateName: string;
  lastMessageBody: string | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

export interface ConversationListResponse {
  items: Conversation[];
  total: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: "candidate" | "company";
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
