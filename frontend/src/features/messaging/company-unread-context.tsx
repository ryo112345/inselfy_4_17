"use client";

import { createUnreadContext } from "@/features/unread/create-unread-context";
import { fetchCompanyUnreadCount } from "./api";

const { Provider, useUnread } = createUnreadContext("company-messaging", async () => {
  const { count } = await fetchCompanyUnreadCount();
  return count;
});

export { Provider as CompanyUnreadMessagingProvider, useUnread as useCompanyUnreadMessaging };
