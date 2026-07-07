const STORAGE_KEY = "inselfy_admin_api_key";

export function getAdminKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setAdminKey(key: string) {
  window.localStorage.setItem(STORAGE_KEY, key);
}

export function clearAdminKey() {
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * fetch wrapper for /api/admin/* that attaches the stored X-Admin-Key.
 * On 401 the stored key is cleared and the page reloads so the key gate
 * (admin/layout.tsx) can prompt for a new one.
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const key = getAdminKey();
  if (key) headers.set("X-Admin-Key", key);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    clearAdminKey();
    window.location.reload();
  }
  return res;
}
