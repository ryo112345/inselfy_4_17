import type { NotificationListResponse } from "../scout/types";

const BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8081"
    : "";

// ---------------------------------------------------------------------------
// User (candidate) notifications
// ---------------------------------------------------------------------------

export async function fetchUserNotifications(params?: {
  limit?: number;
  offset?: number;
}): Promise<NotificationListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  const res = await fetch(
    `${BASE_URL}/api/notifications${qs ? `?${qs}` : ""}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch user notifications");
  return res.json();
}

export async function fetchUserUnreadCount(): Promise<{ count: number }> {
  const res = await fetch(`${BASE_URL}/api/notifications/unread-count`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch unread count");
  return res.json();
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark notification as read");
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/notifications/read-all`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark all notifications as read");
}

// ---------------------------------------------------------------------------
// Company notifications
// ---------------------------------------------------------------------------

export async function fetchCompanyNotifications(params?: {
  limit?: number;
  offset?: number;
}): Promise<NotificationListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  const res = await fetch(
    `${BASE_URL}/api/company/notifications${qs ? `?${qs}` : ""}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch company notifications");
  return res.json();
}

export async function fetchCompanyUnreadCount(): Promise<{ count: number }> {
  const res = await fetch(
    `${BASE_URL}/api/company/notifications/unread-count`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch company unread count");
  return res.json();
}

export async function markCompanyNotificationAsRead(
  id: string,
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/company/notifications/${id}/read`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error("Failed to mark notification as read");
}

export async function markAllCompanyNotificationsAsRead(): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/company/notifications/read-all`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error("Failed to mark all notifications as read");
}
