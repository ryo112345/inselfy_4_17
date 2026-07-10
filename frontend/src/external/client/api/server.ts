import "server-only";
import { cookies } from "next/headers";
import { buildCookieHeader } from "@/lib/cookie-header";
import { client } from "./client";

// SSR（サーバコンポーネント・generateMetadata）からの SDK 呼び出しに、閲覧者の認証 Cookie を
// 自動転送する request interceptor。SDK をサーバー側で呼ぶルートのエントリ（page.tsx 等）で
//   import "@/external/client/api/server";
// を一度読み込むと、そのルートのサーバー側 SDK リクエスト全てに適用される。
// cookies() は Next の AsyncLocalStorage 経由でリクエストスコープの値を返すため、
// interceptor 内で await しても呼び出し元リクエストの Cookie が正しく載る。
client.interceptors.request.use(async (request) => {
  // 呼び出し側が明示的に Cookie を渡している場合はそちらを優先する
  if (request.headers.has("Cookie")) return request;
  try {
    const cookieHeader = buildCookieHeader(await cookies());
    if (cookieHeader) request.headers.set("Cookie", cookieHeader);
  } catch {
    // リクエストスコープ外（ビルド時プリレンダ等）では転送しない
  }
  return request;
});
