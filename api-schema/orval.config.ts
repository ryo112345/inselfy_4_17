import { defineConfig } from "orval";

// OpenAPI → React Query フック生成（orval）。
// 出力はフック（useXxx）と平関数（xxx — RSC から直接 await 可）が同居し、
// 全リクエストが custom-fetch.ts の mutator（baseUrl 切替・SSR Cookie 転送・
// 401→refresh→リトライ→/login・非2xx→ApiError throw）を経由する。
// 実行は scripts/generate-ts.sh（npm run generate:ts）。
//
// 注意: orval 8.x は Node >=22.18.0 を要求する（22.11 でも動作するが npm が
// バージョン解決で 7.x に落とすため、devDependencies で 8.22.0 に exact 固定している）。
const OUT = "../frontend/src/external/client/api/orval";

export default defineConfig({
  inselfy: {
    input: "./generated/openapi.yaml",
    output: {
      mode: "tags-split",
      target: `${OUT}/generated/endpoints`,
      schemas: `${OUT}/generated/models`,
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      prettier: false,
      override: {
        mutator: {
          path: `${OUT}/custom-fetch.ts`,
          name: "customFetch",
        },
        // mutator の返り値（成功時 data / 失敗時 ApiError throw）をそのまま TData にする
        fetch: {
          includeHttpResponseReturnType: false,
        },
        // useInfinite は生成しない: orval 8.22 の useInfinite 出力は TanStack Query v5 の
        // pageParam: unknown と噛み合わず strict TS でコンパイルエラーになる（実測）。
        // 無限スクロール（分類C）は生成平関数 + 手書き useInfiniteQuery で実装する。
      },
    },
  },
  // フォーム入力検証用の Zod スキーマ生成（Phase 4）。
  // リクエスト body のみ生成する（レスポンス検証は schema-first + CI ドリフト検査で
  // 構造的に担保済みのため生成しない。query/param/header も現状フォーム用途がないため省く）。
  // 日本語エラーメッセージは zod-params.ts（params mutator）で注入する。
  // 生成コードには `zodParams({...})` 呼び出しが埋め込まれ、スキーマ構築時に
  // ランタイムで評価される（= メッセージ文言の変更に再生成は不要）。
  inselfyZod: {
    input: "./generated/openapi.yaml",
    output: {
      mode: "tags-split",
      target: `${OUT}/generated/zod`,
      client: "zod",
      clean: true,
      prettier: false,
      fileExtension: ".zod.ts",
      override: {
        zod: {
          // インストール済み zod からの自動推定に頼らず出力を決定的にする
          version: 4,
          generate: {
            body: true,
            param: false,
            query: false,
            header: false,
            response: false,
          },
          params: {
            path: `${OUT}/zod-params.ts`,
            name: "zodParams",
          },
        },
      },
    },
  },
});
