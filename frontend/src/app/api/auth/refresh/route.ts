import { type NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.INTERNAL_API_URL ?? "http://localhost:8081";

export async function POST(req: NextRequest) {
  const res = await fetch(`${BACKEND}/api/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: req.headers.get("cookie") ?? "",
    },
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
