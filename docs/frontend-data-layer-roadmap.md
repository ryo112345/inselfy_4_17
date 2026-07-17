# フロントエンド データ取得層ロードマップ（React Query → orval → Zod）

hey-api 生成SDK＋手書き `useState/useEffect` の現状から、段階的に
「React Query によるクライアント状態管理 → orval によるフック生成 → フォーム検証の schema-first 化」
へ進めるための計画と判断記録。**どのセッションから再開しても作業が完結するように書いてある。**
2026-07-16 の調査・議論に基づく。

## 判断記録（なぜこの計画か）

### 検討して見送った選択肢

| 選択肢 | 見送り理由 |
|---|---|
| **openapi-typescript への移行** | 最大の動機だった client-fetch 0.10.2 固定問題は openapi-ts 0.99（クライアント同梱方式）で解消済み。書き味の差も小さく（`関数名({body})` → `client.POST("/path", {body})`）、1.5〜2.5人日の横移動でユーザー価値ゼロ。見積もり詳細は本ドキュメント末尾の付録A。 |
| **orval の即時全面導入** | hey-api 載せ替え＋interceptor移植＋`api.ts` 層再設計＋52ファイル書き換えが同時に走る最大リスク構成。React Query が本当に合うかを小さく確認してからにする（Phase 1→2 のゲート方式）。 |
| **手書き React Query 全面化 → その後 orval** | 同じ52ファイルを2回書き換える二度書きになる。全面化するなら orval 生成フックで一気にやる（Phase 3）。 |
| **Zod の単体導入** | 自前バックエンドのみ＋同一スキーマ生成＋CIドリフト検査により、レスポンスのランタイム検証は構造的に不要。入力検証はバックエンドの OpenAPI 検証MW が最終防衛として稼働済み。手書き Zod スキーマは TypeSpec との二重管理になるため**禁止**。使うなら orval の生成物として（Phase 4）。 |

### hey-api 継続の説明（選定理由の言語化）

- 型だけでなく「呼べる関数」まで生成したかった。バックエンドが oapi-codegen（OpenAPI→Goコード生成）
  なので、フロントも同じ「スキーマから関数を生成する」発想で揃えた。
- openapi-typescript は型のみ生成する思想なので外した。orval は主眼が React Query フック生成で、
  当時 React Query を使っていなかったため強みが活きなかった。
- fetch ベースで SSR（サーバコンポーネント）とブラウザの両方で同一SDKが動く。
- 旧弱点（client-fetch を 0.10.2 に固定しないと生成物と型が合わない）は openapi-ts 0.99 への
  一括アップグレード（#20, 2026-07-12）で解消。現在はランタイムクライアントごと
  `generated/client/` に同梱され、frontend の package.json に hey-api 依存は無い。

### SSR / SEO と React Query の関係（誤解の整理）

- SEO 要件（求人・企業・記事・プロフィールの公開ページ、`generateMetadata` 実装済み）→ SSR 中心。
- **初期表示**はサーバコンポーネントで取得して HTML に焼くため React Query 不要。
- React Query が効くのは**その後のクライアント操作**（一覧のページング・再取得・キャッシュ・
  loading/error 状態管理）。SSR と React Query は排他ではなく担当領域が違う。

## 現状インベントリ（2026-07-16 全件監査済み）

データ取得を伴うファイルは**約66**（初期grepの52は過小。UI専用useEffectは除外済み）。
1ファイル複数該当ありの分類集計:

| 分類 | 件数 | React Query での置き換え先 |
|---|---|---|
| A: マウント時1回取得 | 33 | `useQuery`（定型） |
| B: deps変化で再取得 | 12 | `useQuery` + queryKey（定型） |
| C: ページネーション/無限スクロール手回し | 8 | `useInfiniteQuery` |
| D: ミューテーション後の再取得/router.refresh | 34 | `useMutation` + `invalidateQueries` |
| E: 認証絡み・401が正常系 | 20 | ⚠️ retry/throwOnError 設計が必要 |
| F: 変則（定型に収まらない） | 12 | 下記参照 |

**F の内訳（React Query の枠外の設計判断が要るもの）:**
- WebSocket購読系 3（useWebSocket / MessagesPageContent / company/messages）— 購読は別管理のまま
- 複数API直列・並列合成 4（useApplicationsSearch の直列連鎖、admin/reports 6並列、
  scout/send 3並列、useJobSearch・useTalentSearch の一覧+付随データ多段）— query分割 or queryFn内合成
- BroadcastChannel 跨タブ 3（jobs/preview, jobs/new, profile/preview）— Query対象外
- 演出連鎖 2（AiReportSection のタイプライター、RichEditor）

**`features/*/api.ts` 全約130関数の変換ロジック棚卸し:**

| 変換の種類 | 件数 | orval 移行時の扱い |
|---|---|---|
| 素通し（run() のみ） | 約90 | 生成フックに直接置換可 |
| `.items`/`.url` ほどき・デフォルト値のみ | 約22 | `select` で吸収可 |
| 複雑加工 | **5関数群** | **手書き queryFn として温存** |

複雑加工の5関数群: `fetchCandidateDetail`（5API並列+部分失敗許容+再マッピング）、
`fetchTeamScoreAverages`（走査+平均算出）、`searchTalents`（kind別4関数ディスパッチ）、
`fetchPanelData*` 系3関数（7API合成+キーワード生成+日付整形の PanelData 集約）。

**監査で判明した追加の罠:**
- admin 系（users/companies/admins/reports）は生成SDK非経由の生fetch（`adminFetch`:
  `X-Admin-Key` 付与+401で `clearAdminKey()`+reload）。スコープ外维持だが、RQ化する場合は
  401リロード副作用と衝突するため queryFn 設計に注意
- `skipAuthRedirect` で401を握り潰す unread 系は RQ の `retry: false` + エラー握り潰しを明示する
- SSRプリフェッチ済みデータを props で受けている箇所（useJobSearch / PanelNavigator の
  initial* props）は `initialData` / `HydrationBoundary` への載せ替え設計が要る

キャッシュが無いため「一覧→詳細→戻る」で毎回再取得している。ここが UX 改善の本丸。
OpenAPI スペックは **3.0.0**（orval は 3.0 完全対応のため互換性問題なし）。

---

## Phase 1: React Query 部分導入（手書き・重い一覧3ページのみ）

**目的:** React Query がこのコードベースに合うか、`api.ts` 層とどう同居するかを最小コストで確定する。

### 作業項目

- [x] `@tanstack/react-query` v5 を導入（`@tanstack/react-query-devtools` は devDependencies）
- [x] `QueryClientProvider` をクライアント境界に設置
      （`app/layout.tsx` 直下に `"use client"` の Provider コンポーネントを1枚挟む。
      `staleTime` はデフォルト 30s 程度から開始）
- [x] `company/saved-candidates/page.tsx` を `useInfiniteQuery` 化（参照実装にする）
- [x] `company/talents/page.tsx` を移行
- [x] `company/applications/page.tsx` を移行

### Phase 1 実施メモ（2026-07-16 完了）

- 導入バージョン: `@tanstack/react-query` 5.101.2。Provider は
  `src/app/components/QueryProvider.tsx`（`staleTime` 30s / `retry` 1 /
  `refetchOnWindowFocus` false — 401 が正常系の呼び出しと従来挙動に合わせた設定）を
  `app/layout.tsx` の最外殻に設置。
- query key は `features/talent-search/queryKeys.ts` に集約
  （page ファイルからの named export は Next.js のページ型検査で落ちるため feature 側に置く）。
- `useCandidateDetail` を `useQuery` 化し、talents / saved-candidates / applications の
  3ページで候補者詳細キャッシュを**共有**（`candidateDetailQueryKey`）。AbortController の
  手動管理は RQ の signal 伝播で置換。applications 側は従来「応募 id 切替でも再取得」だったが、
  データが候補者にしか依存しないため候補者単位キャッシュに変更（意図的な差分）。
- talents の検索は「submitted 状態（検索ボタン/URL復元で確定した条件）を queryKey にする」方式。
  フィルタ入力中の自動再検索を防ぎ、従来の「ボタン押下で検索」を維持。戻る復元の
  `talents_loaded_count` は `firstPageLimit` として1ページ目でまとめ読み（従来と同じ）。
- applications のステータス更新は `useMutation` + `setQueryData`（表示中一覧の該当行のみ書き換え、
  フィルタから外れた行が即消えない従来挙動を維持）+ `invalidateQueries(refetchType:"none")`
  （他フィルタのキャッシュは次回表示時に再取得）。
- 検証: `tsc` / `biome` クリーン。Playwright スクリプトで手動確認相当を自動化し全 PASS
  （検索1リクエスト／無限スクロール 20→40件／プロフィール往復後の同一条件再検索が
  300ms 以内にキャッシュから2ページ40件を即時復元／applications のフィルタ切替→戻しで
  キャッシュヒット（API 0回）／チーム診断検索 teams→scores→diagnostic の直列動作）。
- **既存バグ2件を追修正（2026-07-17）:**
  1. プレーン検索の「戻る」での結果自動復元が元から不動作だった（マウント復元 effect の
     `diagnosticMode==="team" && !selectedTeamId` 早期 return が、URL に常に `mode=team` が付く
     プレーン検索で必ず成立）。復元も `handleSearch` と同じ `getSearchKind`/`buildSearchParams`
     判定に統一して修正。
  2. e2e のログインパスワード不一致（スペックは `test1234`、開発DBは `password123`）。
     スペックを `password123` に統一し、`backend/scripts/seed.sql` の企業アカウント30件の
     ダミーハッシュも `password123` の bcrypt 値に置換（既存開発DBの残り29件も UPDATE 済み）。
- **e2e スペックの現行 UI 追従:** `talents-*.spec.ts` は旧 UI（`?tab=diagnostic`・
  「マッチング検索」ボタン・`select` の序数指定）前提だったため現行 UI に更新。
  加えて (a) `router.replace` の URL 同期は非同期なので遷移前に `toHaveURL` で同期完了を待つ、
  (b) デスクトップ幅ではカード内プロフィールリンクが `lg:hidden` のため `:visible` で選ぶ、
  の2点を修正。8本全て安定 PASS（repeat-each=2〜5 で確認）。`test-results/` は gitignore 化。
- **キャッシュ導入で顕在化したレース:** RQ キャッシュで一覧が即時復元されると、手動の
  ページスクロール復元（rAF 1回）が Next.js の戻る遷移時スクロール処理に後から 0 に
  上書きされることがある。talents / applications の復元処理を「位置が定着するまで最大500ms
  再適用」に変更して解消。
- **残り4スペックも修復済み（2026-07-17）— e2e スイート 13本全 PASS:**
  - 共通基盤: `e2e/helpers.ts` を新設（bypass-login・応募の ensure・面接提案）。admin API は
    fail-closed のため `playwright.config.ts` がリポジトリルート `.env` から `ADMIN_API_KEY` を
    読み込む。メッセージ系3スペックは同一会話（rina_takahashi ↔ inselfy）を共有するが、
    再提案が同一応募の既存提案を自動キャンセルするため**スペックごとに別求人へ応募**して分離。
  - `panel-navigator`: 参照ユーザー aaa/aaho が DB に存在しない→ rina_fujita / taro_yamada に変更。
    診断閲覧はログイン必須になったため閲覧者ログインを追加、パネル順変更（統合レポートが
    WV の前に挿入）で「>」2クリックに修正。
  - `proposal-cancel-display` / `calendar-slot-selector-week-nav`: 参照していた応募 ID が消滅
    →セットアップで応募＋提案を自前作成。propose API の必須フィールド追加
    （`location`・`expiresInDays`）に追従。週送り矢印は候補枠が複数週にまたがる場合のみ
    描画されるため、+2日と+9日の2枠を提案。
  - `messages-scroll-demo`: `page.pause()` で止まる手動デモだった→会話を自前で用意する
    メッセージスモークテストに変更。
  - **devtools の罠:** React Query Devtools のフローティングボタンがページ内ボタン
    （プロフィールのパネルナビ等）を覆いクリックを塞ぐため、`NEXT_PUBLIC_RQ_DEVTOOLS=1` の
    ときだけ描画するよう変更（既定は非表示）。

### 設計規約（Phase 1 で確定させる）

1. **queryFn には既存の `features/*/api.ts` 関数をそのまま使う。**
   `run()` による ApiError 整形・`.items` ほどき・ドメイン型合成は温存。
   React Query は「状態管理層」として上に被せるだけで、通信層には触らない。
   ```ts
   useInfiniteQuery({
     queryKey: ["savedCandidates"],
     queryFn: ({ pageParam }) => fetchSavedCandidates(PAGE_SIZE, pageParam),
     initialPageParam: 0,
     getNextPageParam: (last, all) => /* total と件数から次 offset or undefined */,
   });
   ```
2. **query key 規約:** `[<feature名>, <リソース>, パラメータ...]` の配列。文字列連結しない。
3. ミューテーション後の再取得は `queryClient.invalidateQueries({ queryKey: [...] })`。
   `router.refresh()` との混在はページ単位でどちらかに寄せる。

### 完了条件・検証

- 3ページで `loading/loadingMore/hasMore` 系の手動 useState と IntersectionObserver 以外の
  ページング状態管理が消えている
- `cd frontend && npx tsc --noEmit && npm run biome:check`
- 手動確認: 一覧→詳細→戻るでキャッシュが効く／無限スクロール／保存・ステータス更新後の一覧反映
- **dev サーバ稼働中に `next build` を実行しない**（既知の競合）

## Phase 2: 評価ゲート（orval 全面化の判断）

**技術的成立性は 2026-07-16 の調査で確認済み**（下記「orval 裏取り結果」）。よってゲートの
残項目は「体感」ではなく以下の具体的検証のみ。**Yes が揃わなければ Phase 3 へ進まず、手書き
React Query の適用範囲を必要なページだけ広げて終了とする（それも十分な着地点）。**

- [x] 3ページで DX（コード量・可読性）と UX（キャッシュ効果）が実際に改善したか
- [x] `api.ts` を queryFn に使う同居方式に無理がなかったか
- [x] mutator プロトタイプ（Phase 3-0 の先行実施でも可）で 401罠・SSR Cookie 転送が再現できたか
- [x] 実スペック（openapi.yaml 3.0.0）で orval の生成を試行し、型・フックが期待通り出たか

### Phase 2 実施メモ（2026-07-17 完了 — **判定: Go、Phase 3 へ進んでよい**）

**1. DX/UX 改善（Yes）:**
- `useCandidateDetail` は 65行→35行。useState×8 + useEffect + AbortController 手動管理が
  `useQuery` 1つに置き換わり、副産物として候補者詳細キャッシュの3ページ共有を獲得。
- 3ページ+3フック合計で 404挿入/432削除（新規基盤 QueryProvider + queryKeys の48行を足すと微増）。
  行数はほぼ同じだが、キャッシュ・重複排除・signal 中断・状態機械の宣言化を「タダで」得た。
- UX は Phase 1 メモの Playwright 実測どおり（同一条件再検索 300ms 以内・フィルタ往復 API 0回）。
- ただし F 分類の `useApplicationsSearch`（直列連鎖）は 117/116 でサイズ不変。**orval の効きどころは
  A〜D の定型（素通し約90関数）であり、F を手書き queryFn で温存する Phase 3 方針を裏付ける結果。**

**2. 同居方式（Yes）:** Phase 1 全体で `features/*/api.ts` は diff ゼロ（無変更）。run()/ApiError/
ドメイン型合成は queryFn からそのまま使え、React Query を上に被せるだけで成立した。

**3. mutator プロトタイプ（Yes・実証済み）:**
- `frontend/src/external/client/api/orval-prototype/custom-fetch.ts` に client.ts + server.ts +
  run() の仕事（baseUrl 切替・credentials・skip 擬似ヘッダ・401→単一 in-flight refresh→リトライ→
  /login リダイレクト・非2xx→ApiError throw）を1関数で統合。
- **next/headers はクライアントバンドルに import できないため**、SSR Cookie 転送は
  `setSsrCookieProvider()` 注入方式にし、`orval-prototype/server.ts`（"server-only"）を
  page.tsx で一度 import する現行 server.ts と同じ運用を維持した。
- e2e で実証（`e2e/orval-mutator-check.spec.ts` + 検証ページ `/dev/orval-check`、repeat-each=2 で
  6/6 PASS）: (a) 未ログイン+skip 付き生成フック → 401 が error に乗るだけでリダイレクトなし、
  (b) 未ログイン+skip なし → refresh 失敗後 /login へリダイレクト、(c) 企業ログイン中の SSR →
  Cookie 転送で企業名がサーバレンダリングされ HTML に焼かれる。
- 未検証の残り: refresh **成功**→リトライ経路（期限切れアクセストークン状態の再現が手間なため。
  コードは現行 client.ts と同型）。Phase 3-0 本実施時に確認する。

**4. 生成試行（Yes）:** orval **8.22.0** × 実スペック（206 operations）で生成成功。
- tags-split で 297ファイル。フック（`useXxx`）+ 平関数（`xxx` — RSC から直接 await 可）+
  `getXxxQueryKey()` + `request?: SecondParameter<typeof customFetch>`（skipAuthRedirect を
  型安全に渡せる）がすべて期待どおり出た。`{ signal }` は queryFn に自動伝播。
- `includeHttpResponseReturnType: false` + mutator で、mutator の返り値（=非2xx で ApiError throw、
  2xx で data）がそのまま TData/TError に乗る。**生成物297ファイル込みで `tsc --noEmit` クリーン**。
- モデル名は `ModelsTalentListResponse` 等、hey-api 生成物とほぼ同じ命名になる（移行時の型参照の
  書き換えが素直に対応付く）。

**判明した注意点（Phase 3 で効くもの）:**
- **Node 要件:** orval 8.x は `engines: node >=22.18.0`。ローカル 22.11.0 だと `npm i orval` が
  7.x に解決するため **`orval@8.22.0` をバージョン明示**で入れる（22.11 でも動作は問題なし）。
  CI は `node-version: 22`（最新パッチ解決）なので問題なし。導入時にローカル Node を 22.18+ へ。
- **生成フックの query オプション上書き時は queryKey も必須:** `query?: UseQueryOptions`（v5 素の型）
  のため、`retry: false` 等を渡すときは `getXxxQueryKey()` も併せて渡す。
- 配列クエリパラメータは実スペックに存在しない（skills はカンマ区切り string）ため、orval の
  URL ビルダー（`String()` 直列化）との相性問題は無い。
- biome は生成物を除外する（biome.jsonc に `!src/external/client/api/orval-prototype/generated`
  を追加済み。Phase 3 では正式な生成先に合わせて更新）。

**プロトタイプ一式の場所（Phase 3-0 の素材。不要になったら削除可）:**
- `frontend/src/external/client/api/orval-prototype/`（custom-fetch.ts / server.ts / generated/）
- `frontend/src/app/dev/orval-check/`（検証ページ）+ `frontend/e2e/orval-mutator-check.spec.ts`
- 再生成に使った設定（orval は未だ依存に入れていない。scratchpad から実行した）:
  ```ts
  // orval.config.ts（要 orval@8.22.0）
  export default defineConfig({
    inselfy: {
      input: "api-schema/generated/openapi.yaml",
      output: {
        mode: "tags-split",
        target: "frontend/src/external/client/api/orval-prototype/generated/endpoints",
        schemas: "frontend/src/external/client/api/orval-prototype/generated/models",
        client: "react-query",
        httpClient: "fetch",
        clean: true,
        prettier: false,
        override: {
          mutator: { path: ".../orval-prototype/custom-fetch.ts", name: "customFetch" },
          fetch: { includeHttpResponseReturnType: false },
        },
      },
    },
  });
  ```

### orval 裏取り結果（2026-07-16、公式docs/GitHubで一次確認済み）

| 検証項目 | 結果 |
|---|---|
| メンテナンス | ◎ v8.22.0（2026-07-14）、ほぼ毎週リリース、issue消化が流入超過 |
| TanStack Query v5 | ◎ 対応済み。`getXxxQueryOptions` も v5 形。Suspense系・`usePrefetch`(SSR用)も生成可 |
| fetch ベース mutator | ◎ 公式サポート。`httpClient` のデフォルトが `'fetch'`。mutator 第2引数で per-request headers（`skipAuthRedirect` 相当）を型安全に渡せる |
| フック+非フック関数 | ◎ 同一出力にフック(`useListX`)と平関数(`listX`)が同居。RSCからは平関数を直接 await（公式サンプル `next-app-with-fetch` が実証） |
| queryKey 生成 | ◎ `getXxxQueryKey()` が操作ごとに export → invalidation に直用可 |
| Zod 生成 | ○ Zod 4 ベース、maxLength等の制約反映。**日本語メッセージ注入は `override.zod.params`（v8.14.0, 2026-05出荷）で可能だが枯れていない** |
| OpenAPI 互換 | ◎ うちのスペックは 3.0.0 → 完全対応圏内 |
| Next.js App Router | ○ 公式ガイドは無いが公式サンプルあり。RSCがフック入りファイルを import しないよう出力分離を検討 |

既知の残リスク: (a) Zod のメッセージ注入と 3.1 系修正がここ1〜2ヶ月の新機能で枯れていない
（ただし Zod は Phase 4 で後回しにできる）、(b) queryOptions のみの出力は未対応（issue #1788）。

## Phase 3: orval 全面化（ゲート通過後のみ）

**目的:** 52ファイル分の useQuery ボイラープレート・query key・invalidation を生成に置き換える。
schema-first は崩れない（orval も同じ OpenAPI を入力にするため、TypeSpec 単一ソースは維持される）。

### Phase 3 実施メモ（2026-07-17 — 3-0 / 3-1 / 3-2参照実装まで完了）

**完了済み:**
- **3-0 mutator 本実装:** `frontend/src/external/client/api/orval/custom-fetch.ts`（SSR Cookie 転送は
  `orval/server.ts` の `setSsrCookieProvider` 注入、page.tsx で一度 import する運用）。
  refresh **成功→リトライ**経路も e2e で実証済み（アクセストークン Cookie だけ消して
  refresh_token を残し、401→refresh 200→リトライ 200・リダイレクトなし・新トークン再発行を確認）。
- **3-1 生成基盤:** `api-schema/orval.config.ts` + `orval@8.22.0`（exact 固定・要 Node 22.18+、
  22.11 でも動作）。`generate-ts.sh` が hey-api に続けて orval も生成。drift 検査
  （`scripts/check-generated-drift.sh` / workflow）と biome 除外に
  `frontend/src/external/client/api/orval/generated` を追加済み。
- **3-2 参照実装（Phase 1 の3ページ）:** talent-search / job-application feature を移行。
  - 素通し → 生成フック直用＋`select` で `.items` ほどき（例: `useCompanyTeamsListTeams`）
  - 一覧＋フィルタ → 生成フック＋`getXxxQueryKey(params)`（applications。ステータス更新は
    生成ミューテーションフック＋生成キーの `setQueryData` で従来挙動を維持、実機確認済み）
  - 無限スクロール → **生成平関数＋手書き `useInfiniteQuery`**（saved-candidates）
  - 複雑加工5関数群 → 手書き queryFn 温存で内部だけ orval 平関数化（fetchCandidateDetail /
    fetchTeamScoreAverages / searchTalents）
  - 検証: tsc / biome クリーン、e2e 17本全 PASS、3ページの実ブラウザ駆動確認
  - 未使用だった `fetchCandidateApplications` / `withdrawApplication` は削除（デッドコード）

**移行で見つけて直した実バグ（orval 以前から存在）:**
- **refresh 単一飛行の分裂:** `auth-context.tsx` が生 fetch で独自に refresh しており、SDK
  インターセプタの refresh と競合し得た。refresh トークンはローテーション＋失敗時
  `clearedAuthCookies`（Cookie 全消去）のため、同時 refresh は「負けた側の 401 が勝った側の
  新トークンを消す」= 強制ログアウトになる。`external/client/api/refresh.ts` に単一飛行を
  切り出し、hey-api client / orval mutator / auth-context の3者で共有するよう修正。
  **今後 refresh を呼ぶコードは必ずこのモジュールを経由すること。**

**確定した規約（3-1 の未決分）:**
- 生成キー（`getXxxQueryKey`）は「生成レスポンスをそのままキャッシュする query」にだけ使う。
  合成・加工データ（candidateDetail 等）は手書きキー（生成キーを流用すると同じキーに別形の
  データが同居して壊れる）。`features/*/queryKeys.ts` は両者の置き場＆生成キーの再エクスポート点。
- orval の `useInfinite` 生成は使わない（TanStack v5 の `pageParam: unknown` と噛み合わず
  strict TS でコンパイルエラー、実測）。分類Cは生成平関数＋手書き `useInfiniteQuery`。
- `features/*/api.ts` は「複雑加工の手書き queryFn」と「他 feature から呼ばれる薄いラッパー」
  だけ残す。素通しは置かない（呼び出し側が生成フックを直用）。
- ~~refresh 同時実行の罠（上記）により、このテーマの e2e（orval-mutator-check の refresh テスト）は
  同一ユーザーでの並列多重実行不可（--repeat-each は --workers=1 で）。~~
  → rotation の per-token 化（auth-refresh-hardening 修正1）で解消。並列多重実行可。

**残作業（3-2 続き）:** 残り feature の移行（scout / messaging / interview / job-posting /
job-search / notifications / posts / articles / profile ほか、1 feature = 1 コミット）→
完了後に hey-api 生成物（`generated/`）・`client.ts`・`server.ts` を削除し、
`orval-check` 検証ページ／スペックの扱いを決める。

**横展開の前提条件（2026-07-17 解消済み）:** `docs/auth-refresh-hardening.md` の修正1・2は
実装・検証済み（rotation の per-token 化＋mutator の領域別 refresh）。mutator / interceptor は
リクエストパスで realm を判定し、企業 API の 401 は `/api/company/auth/refresh` → 失敗時
`/company/login` に分岐する。companyFetch ベースのページも移行してよい。

### 3-0. 最初に mutator をプロトタイプする（最大リスクを先頭に）

orval の `override.mutator` に現在の `client.ts` + `server.ts` + `run()` の仕事を統合する:

- baseUrl 切替（ブラウザ: `""` / サーバ: `INTERNAL_API_URL`）
- `credentials: "include"`、`X-Skip-Auth-Redirect` 擬似ヘッダの除去
- 401 → refresh（単一 in-flight Promise）→ リトライ → 失敗時 `/login` リダイレクト
  （skip ヘッダと `/login` 自身は除外）
- SSR 時の Cookie 転送（`next/headers` の `cookies()`。リクエストスコープ外は握りつぶす）
- 非 2xx は `unwrap()` で ApiError を throw（→ React Query の `error` に ApiError が乗る）

**⚠️ 401インターセプタの罠（docs/frontend-generated-client-migration.md 参照）を必ず再検証する。**
未ログイン訪問者が公開ページ（/, /jobs, /profile/xxx 等）を開いて /login に飛ばされないこと。
auth-context / company-auth-context / unread 系の「401 が正常系」の呼び出しを壊さないこと。

### 3-1. 生成設定と規約

- [ ] `orval.config.ts` を api-schema 側に置き、`generate-ts.sh` を orval 実行に差し替え
- [ ] client は `client: 'react-query'`（httpClient はデフォルト fetch）＋ custom mutator。
      同一出力にフックと平関数が同居するので、**RSC からは平関数を await**。
      RSC がフック入りファイルを import して問題が出る場合は fetch client の別出力に分離
      （orval は複数プロジェクト出力に対応）
- [ ] `includeHttpResponseReturnType: false` を明示（デフォルトは `{status, data}` ラッパ返し）
- [ ] per-request オプション（`skipAuthRedirect` 相当）は mutator 第2引数
      （生成側の `request?: SecondParameter<...>`）で渡す
- [ ] ドメイン整形の置き場規約: `features/*/hooks.ts` に薄いラッパフックを置き、
      `select` で `.items` ほどき・型合成を行う。**コンポーネント内に生の select を書かない**
      （select で吸収可能なのは監査済みの約22関数）
- [ ] **複雑加工の5関数群**（fetchCandidateDetail / fetchTeamScoreAverages / searchTalents /
      fetchPanelData系）は生成フックに寄せず、**手書き queryFn として温存**する
- [ ] invalidation は生成される `getXxxQueryKey()` を使う（キー手書き禁止）
- [ ] `features/*/api.ts` は SSR 用の関数層として残すか hooks.ts に統合するか、移行初週に決める

### 3-2. 移行

- [ ] Phase 1 の3ページを生成フックに置き換え（参照実装）
- [ ] 残りを feature 単位で移行（1 feature = 1 コミット、都度 `tsc && biome`）
- [ ] 完了後: 旧 `external/client/api/generated`（hey-api 生成物）と手書き interceptor を削除

### スコープ外（現行どおり手書き維持）

auth-context / company-auth-context / useWebSocket / admin ページ / BFF route.ts
（理由は docs/frontend-generated-client-migration.md のスコープ外リストと同じ）

## Phase 4: Zod（フォーム入力のみ・orval 生成で）

- [ ] orval の zod 生成（Zod 4 ベース）でリクエストモデルの Zod スキーマを生成
      （TypeSpec の `@maxLength` 等の制約が源泉。**手書き Zod スキーマは二重管理になるため書かない**）
- [ ] 日本語エラーメッセージは `override.zod.params`（v8.14.0+ のメッセージ注入機構、
      operationId / fieldPath コンテキスト付き）で codegen 時に注入する。
      **2026-05 出荷の新機能で枯れていないため、導入時に最新 issue を確認すること**
- [ ] 対象は入力フォーム（求人作成・企業プロフィール・サインアップ等）のみ。
      **レスポンス検証には使わない**（schema-first＋CIドリフト検査で構造的に担保済み）

## 関連する別件（このロードマップとは独立の小タスク）

- [ ] `src/app/sitemap.ts` / `src/app/robots.ts` が無い。SEO を掲げるなら追加する
      （公開ページ: /, /jobs/[jobId], /companies/[id], /articles/[id], /profile/[username]）
- [ ] `docs/frontend-generated-client-migration.md` の「client-fetch 0.10.2 固定」の警告は
      openapi-ts 0.99 移行（#20）で古くなっている。注記を追記する

---

## 付録A: openapi-typescript 移行見積もり（見送ったが記録として保持）

実施する場合の規模感（2026-07-16 時点の測定に基づく）:

| 作業 | 目安 |
|---|---|
| 生成基盤差し替え（型1枚生成＋openapi-fetch 導入） | 0.5h |
| interceptor 移植（`client.use({onRequest/onResponse})` へ、401罠の再検証込み） | 3〜5h |
| 呼び出し112箇所の書き換え（関数名→`client.GET("/path")`、対応表は sdk.gen.ts から機械抽出可） | 4〜7h |
| 型参照25箇所（`Models*` → `components["schemas"][...]`、alias 再export で吸収） | 1〜2h |
| `run()`/skipAuthRedirect 口合わせ＋検証 | 2.5〜4h |
| **合計** | **1.5〜2.5人日** |

`run()` は両者とも `{ data, error }` 形のためほぼ無変更で流用可。
