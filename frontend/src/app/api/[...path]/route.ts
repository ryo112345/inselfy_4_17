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
  const response = new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });

  for (const cookie of res.headers.getSetCookie()) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
