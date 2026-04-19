import { type NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.INTERNAL_API_URL ?? "http://localhost:8081";

export async function GET(req: NextRequest) {
  const res = await fetch(`${BACKEND}/api/auth/me`, {
    headers: {
      Cookie: req.headers.get("cookie") ?? "",
    },
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
