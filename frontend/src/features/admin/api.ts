const STORAGE_KEY = "inselfy_admin_api_key";

// localStorage はプライベートモードや無効化環境で throw しうるので全て try/catch する
export function getAdminKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // 保存できなくても致命的ではない（次回リロードで再入力を促される）
  }
}

export function clearAdminKey() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
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
