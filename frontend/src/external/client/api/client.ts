import { client } from "./generated/client.gen";

const baseUrl =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8081"
    : "";

client.setConfig({
  baseUrl,
  fetch: (request: Request) => {
    const req = new Request(request, { credentials: "include" });
    return fetch(req);
  },
});

let refreshPromise: Promise<boolean> | null = null;

function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

client.interceptors.response.use(async (response, request) => {
  if (response.status === 401 && typeof window !== "undefined") {
    const refreshed = await refreshToken();
    if (refreshed) {
      return fetch(new Request(request, { credentials: "include" }));
    }
    window.location.href = "/login";
  }
  return response;
});

export { client };
