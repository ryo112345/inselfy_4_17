import "server-only";
import { cookies } from "next/headers";
import { buildCookieHeader } from "@/lib/cookie-header";
import { setSsrCookieProvider } from "./custom-fetch";

// SSR（サーバコンポーネント・generateMetadata）からの生成クライアント呼び出しに、
// 閲覧者の認証 Cookie を自動転送するプロバイダ登録。ルートのエントリ（page.tsx 等）で
//   import "@/external/client/api/orval/server";
// を一度読み込むと、そのルートのサーバー側リクエスト全てに適用される（hey-api 版 server.ts と同じ運用）。
// cookies() は Next の AsyncLocalStorage 経由でリクエストスコープの値を返すため、
// mutator 内で await しても呼び出し元リクエストの Cookie が正しく載る。
setSsrCookieProvider(async () => buildCookieHeader(await cookies()));
