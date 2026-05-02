import type {
  Conversation,
  ConversationListResponse,
  Message,
  MessageListResponse,
  UnreadCountResponse,
} from "./types";

const BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8081"
    : "";

// ---------------------------------------------------------------------------
// Company side
// ---------------------------------------------------------------------------

export async function startConversation(body: {
  candidateId: string;
  body: string;
}): Promise<Conversation> {
  const res = await fetch(`${BASE_URL}/api/company/messages/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "会話の開始に失敗しました");
  }
  return res.json();
}

export async function fetchCompanyConversations(
  params?: { limit?: number; offset?: number },
): Promise<ConversationListResponse> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const res = await fetch(
    `${BASE_URL}/api/company/messages/conversations?${q}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("会話一覧の取得に失敗しました");
  return res.json();
}

export async function fetchCompanyConversationMessages(
  conversationId: string,
  params?: { limit?: number; offset?: number },
): Promise<MessageListResponse> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const res = await fetch(
    `${BASE_URL}/api/company/messages/conversations/${conversationId}/messages?${q}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("メッセージの取得に失敗しました");
  return res.json();
}

export async function sendMessageAsCompany(
  conversationId: string,
  body: string,
): Promise<Message> {
  const res = await fetch(
    `${BASE_URL}/api/company/messages/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "メッセージの送信に失敗しました");
  }
  return res.json();
}

export async function markReadAsCompany(
  conversationId: string,
): Promise<void> {
  await fetch(
    `${BASE_URL}/api/company/messages/conversations/${conversationId}/read`,
    { method: "POST", credentials: "include" },
  );
}

export async function fetchCompanyUnreadCount(): Promise<UnreadCountResponse> {
  const res = await fetch(`${BASE_URL}/api/company/messages/unread-count`, {
    credentials: "include",
  });
  if (!res.ok) return { count: 0 };
  return res.json();
}

// ---------------------------------------------------------------------------
// Candidate side
// ---------------------------------------------------------------------------

export async function fetchCandidateConversations(
  params?: { limit?: number; offset?: number },
): Promise<ConversationListResponse> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const res = await fetch(
    `${BASE_URL}/api/messages/conversations?${q}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("会話一覧の取得に失敗しました");
  return res.json();
}

export async function fetchCandidateConversationMessages(
  conversationId: string,
  params?: { limit?: number; offset?: number },
): Promise<MessageListResponse> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const res = await fetch(
    `${BASE_URL}/api/messages/conversations/${conversationId}/messages?${q}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("メッセージの取得に失敗しました");
  return res.json();
}

export async function sendMessageAsCandidate(
  conversationId: string,
  body: string,
): Promise<Message> {
  const res = await fetch(
    `${BASE_URL}/api/messages/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "メッセージの送信に失敗しました");
  }
  return res.json();
}

export async function markReadAsCandidate(
  conversationId: string,
): Promise<void> {
  await fetch(
    `${BASE_URL}/api/messages/conversations/${conversationId}/read`,
    { method: "POST", credentials: "include" },
  );
}

export async function fetchCandidateUnreadCount(): Promise<UnreadCountResponse> {
  const res = await fetch(`${BASE_URL}/api/messages/unread-count`, {
    credentials: "include",
  });
  if (!res.ok) return { count: 0 };
  return res.json();
}
