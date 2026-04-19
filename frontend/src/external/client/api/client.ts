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

client.interceptors.response.use(async (response) => {
  if (response.status === 401 && typeof window !== "undefined") {
    const refreshRes = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!refreshRes.ok) {
      window.location.href = "/login";
    }
  }
  return response;
});

export { client };
