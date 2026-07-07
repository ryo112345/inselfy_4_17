import { type NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8081";

async function proxy(req: NextRequest) {
  const url = new URL(req.url);
  const dest = `${BACKEND}${url.pathname}${url.search}`;

  const headers = new Headers();
  headers.set("Cookie", req.headers.get("cookie") ?? "");
  const ct = req.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);
  const authHeader = req.headers.get("authorization");
  if (authHeader) headers.set("Authorization", authHeader);
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey) headers.set("X-Admin-Key", adminKey);

  const res = await fetch(dest, {
    method: req.method,
    headers,
    body: req.body,
    // @ts-expect-error -- Node fetch supports duplex for streaming request bodies
    duplex: "half",
  });

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await res.arrayBuffer();
  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", res.headers.get("content-type") ?? "application/json");

  const setCookies = res.headers.getSetCookie();
  if (setCookies.length > 0) {
    console.log(
      `[proxy] ${req.method} ${url.pathname} → ${res.status}, forwarding ${setCookies.length} cookies:`,
    );
    for (const cookie of setCookies) {
      console.log(`  Set-Cookie: ${cookie.substring(0, 80)}...`);
      responseHeaders.append("Set-Cookie", cookie);
    }
  }

  return new NextResponse(data, {
    status: res.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
