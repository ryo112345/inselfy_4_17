"use client";

import { createUnreadContext } from "@/features/unread/create-unread-context";
import { fetchScoutUnreadCount } from "./api";

const { Provider, useUnread } = createUnreadContext("scout", async () => {
  const { count } = await fetchScoutUnreadCount();
  return count;
});

export { Provider as UnreadScoutProvider, useUnread as useUnreadScout };
