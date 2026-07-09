"use client";

import { createUnreadContext } from "@/features/unread/create-unread-context";
import { fetchCandidateUnreadCount } from "./api";

const { Provider, useUnread } = createUnreadContext("messaging", async () => {
  const { count } = await fetchCandidateUnreadCount();
  return count;
});

export { Provider as UnreadMessagingProvider, useUnread as useUnreadMessaging };
