// orval mutator プロトタイプの検証ページ（Phase 2 評価ゲート用・検証後に削除可）。
// SSR: 生成された平関数を直接 await し、server.ts 登録の Cookie 転送で
// ログイン中の企業情報がサーバレンダリングされることを確認する。
import "@/external/client/api/orval/server";
import { companyAuthCompanyGetMe } from "@/external/client/api/orval/generated/endpoints/company-auth/company-auth";
import { ApiError } from "@/lib/api-result";
import { OrvalCheckClient } from "./OrvalCheckClient";

export const dynamic = "force-dynamic";

export default async function OrvalCheckPage() {
  let ssrResult: string;
  try {
    const me = await companyAuthCompanyGetMe();
    ssrResult = `SSR_OK: ${me.companyName}`;
  } catch (err) {
    ssrResult = err instanceof ApiError ? `SSR_ERR: ${err.code}` : `SSR_UNEXPECTED: ${String(err)}`;
  }

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-xl font-bold">orval mutator 検証</h1>
      <p data-testid="ssr-result">{ssrResult}</p>
      <OrvalCheckClient />
    </main>
  );
}
