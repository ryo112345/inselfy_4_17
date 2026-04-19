import { type NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.INTERNAL_API_URL ?? "http://localhost:8081";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${BACKEND}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await res.text();
  const response = new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });

  for (const cookie of res.headers.getSetCookie()) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}
