# フロントエンド生成クライアント移行（schema-first Phase 2）

`docs/schema-first-migration.md`（22/22完了）の Phase 2。フロントエンドに残る**手書き `fetch()` を
生成SDK（`@/external/client/api/generated`）呼び出しに置き換え**、TypeSpec を変えたら FE 側も
コンパイルエラーで検出される状態（契約チェックループを閉じる）にする。
**どのセッションから再開しても作業が完結するように書いてある。** 2026-07-05 のインベントリ調査に基づく。

## ゴールと完了条件

- 手書き `fetch()` が「スコープ外リスト」のファイル以外に存在しないこと。確認コマンド:

  ```bash
  cd frontend && grep -rln "fetch(" src --include="*.ts" --include="*.tsx" \
    | grep -v external/client \
    | grep -v "src/app/api/" \
    | grep -v "src/app/admin/" \
    | grep -v "features/auth/auth-context" \
    | grep -v "features/company-auth/company-auth-context" \
    | grep -v "features/messaging/useWebSocket"
  ```

  ↑ これが（Phase 2B 完了までは spec 未収載ファイルを除き）空になれば完了。
- 検証は毎コミット: `cd frontend && npx tsc --noEmit && npm run build`
- **挙動変更ゼロが絶対条件。** リクエストの中身・クエリパラメータ・エラー時のフォールバック挙動を変えない。

## スコープ外（手書き fetch のまま残す）

| ファイル | 理由 |
|---|---|
| `src/app/api/**`（route.ts 5本） | Next.js の BFF プロキシ層。バックエンドへの素通し配線そのもの |
| `src/app/admin/**`（3ページ） | admin API は TypeSpec 対象外（スペックが存在しない） |
| `src/features/auth/auth-context.tsx` | ⚠️ 下記「401インターセプタの罠」参照。移行すると公開ページで /login リダイレクトが起きうる |
| `src/features/company-auth/company-auth-context.tsx` | 同上 |
| `src/app/profile/[username]/page.tsx` の `getCurrentUsername`（auth/me + refresh 部分のみ） | 認証プラミング。同上の理由で手書き維持 |
| `src/features/messaging/useWebSocket.ts` | WebSocket（ws_controller はスペック対象外）。`/api/ws/ticket` もスペック未収載 |
| `src/features/messaging/unread-context.tsx` | ⚠️ ルートレイアウトに無条件マウントされ、未ログイン訪問者の unread-count 401 が正常系（401インターセプタの罠） |
| `src/features/scout/unread-context.tsx` | 同上（ルートレイアウトの UnreadScoutProvider が `/api/scouts` を未ログインでも叩く） |
| `src/external/client/api/client.ts` 内の refresh fetch | インターセプタ自身の実装 |

## 前提知識

### client 設定（`src/external/client/api/client.ts`、変更不要）

- ブラウザでは `baseUrl: ""`（同一オリジン → `src/app/api/[...path]/route.ts` がバックエンドへプロキシ）、
  サーバでは `INTERNAL_API_URL`（デフォルト `http://localhost:8081`）。
  **手書き fetch が `${BACKEND}/api/...` としている SSR 呼び出しも、SDK に替えれば baseUrl は自動で正しくなる。**
- 全リクエストに `credentials: "include"`。
- **401レスポンスインターセプタ:** ブラウザで 401 → refresh 試行 → 失敗なら `window.location.href = "/login"`。

### ⚠️ 401インターセプタの罠（auth系を移行対象から外す理由）

auth-context / company-auth-context は「未ログインなら 401 が返るのが正常」な `me` 呼び出しを
自前でハンドリングしている。これを生成SDK経由にすると上記インターセプタが発動し、
**未ログイン訪問者が公開ページを開いただけで /login に飛ばされる**挙動変更になる。
同様に「401 が正常系」の呼び出しを移行するときは、この相互作用を必ず確認すること。

### ⚠️ @hey-api/client-fetch のバージョン固定（0.10.x）

`sdk.gen.ts` は openapi-ts **0.64.x** 世代の生成物で、`client.get<単一レスポンス型>` を渡す。
client-fetch **0.11+** は `data: TData[keyof TData]` とステータスコードマップを前提にするため、
組み合わせると `data` の型が「レスポンスのプロパティ値の union」に化ける
（初期移行分の `as unknown as` キャストはこの回避策だった）。フロントの
`@hey-api/client-fetch` は **0.10.2 に固定済み**。openapi-ts を上げない限り 0.11+ に上げないこと。
既存の `as unknown as` キャスト（`fetchPanelData.ts`、`profile/api.ts` の `run()` 呼び出し側）は
不要になったので、該当ファイルを触る項目のついでに外してよい。

### SDK 関数の探し方

`frontend/src/external/client/api/generated/sdk.gen.ts`（156関数）を grep。
命名は `<routes/*.tsp の @tag をcamelCase><operation名>`。
例: `usersGetUserByUsername`, `articlesListArticles`, `companyJobPostingsListCompanyJobPostings`。
型は `types.gen.ts` の `Models<Xxx>Request` / `Models<Xxx>Response`。

### 移行パターンA: クライアントサイド（参照実装: `src/app/profile/[username]/api.ts`）

```ts
import "@/external/client/api/client"; // 設定の副作用 import を忘れない
import { usersGetUserByUsername } from "@/external/client/api/generated";

const { data, error } = await usersGetUserByUsername({ path: { username } });
```

hey-api は throw せず `{ data, error }` を返す。既存コードの
「`r.ok ? r.json() : フォールバック`」は「`error ? フォールバック : data`」に写す。
profile/api.ts の `run()`/`unwrap()` ヘルパーのパターンを踏襲してよい。

### 移行パターンB: サーバコンポーネント（SSR）

- 認証不要のエンドポイント: SDK をそのまま呼ぶだけ（baseUrl は自動）。
- 認証が必要なエンドポイント: 現状 `headers: { Cookie: cookieHeader }` を手動転送している
  （例: `profile/[username]/page.tsx:18`）。SDK でも per-call オプションで同じことができる:

  ```ts
  await xxxGetYyy({ path: {...}, headers: { Cookie: cookieHeader } });
  ```

  インターセプタの /login リダイレクトは `typeof window` ガードがあるので SSR では発動しない。

## その他の罠

- **二形レスポンス:** `GET /api/jobs` の生成型は `ModelsJobPostingListResponse | ModelsJobPostingResponse[]` の
  union。呼び出し側で `Array.isArray()` で narrow する（既存の分岐ロジックを踏襲）。
- **snake_case フィールド:** 機能によって JSON キーの命名が混在している（例: integrated-report の
  `request_id`）。生成型はスペックのキー名をそのまま持つので、**手書きコードが期待しているキー名と
  生成型のプロパティ名が一致するかをファイルごとに確認**する。ズレていたら「スペックが実態と違う」
  サインなので、勝手に合わせず curl で実レスポンスを確認してスペック側を直す（→ 再生成）。
- **multipart アップロード**（articles/upload-image、company/jobs の画像3種、users/upload-image）:
  SDK は `body: { file }` を FormData にシリアライズする。移行後に**実際に1回アップロードして動作確認**する
  （型が通っても Content-Type 境界の問題は実行時にしか出ない）。
- **`r.json()` の黙殺フォールバック**（`data.users ?? []` 等）: 挙動維持のためフォールバック自体は残すが、
  型が付くことで dead になる分岐は消してよい。
- **既に混在しているファイル:** `fetchPanelData.ts` と `profile/[username]/api.ts` は一部だけ生成SDK使用済み。
  残りの手書き fetch だけ差し替える。

## 進捗チェックリスト（易しい順 = 着手順、1項目 = 1コミット）

コミット規約: `refactor(frontend): migrate <feature> to generated api client`

| # | 状態 | 項目（ファイル） | EP数 | 主な注意点 |
|---|------|------------------|------|-----------|
| 1 | [x] | similar-users: `app/profile/[username]/SimilarUsersCard.tsx` | 1 | `data.users ?? []` フォールバック維持 |
| 2 | [x] | setup: `app/setup/page.tsx` | 1 | users 系 |
| 3 | [x] | notifications: `features/notifications/api.ts` | 3 | 移行ではなく**削除**（importゼロの死にコードだった。孤児化した scout/types.ts の Notification 2型も削除） |
| 4 | [x] | messaging: `features/messaging/api.ts` | 5 | useWebSocket.ts は触らない。`unread-context.tsx` は401正常系のため**スコープ外に変更**（上表参照） |
| 5 | [x] | team-diagnose: `app/diagnose/[token]/page.tsx` | 2 | |
| 6 | [x] | timeline/posts: `features/timeline/api.ts` | 7 | クエリ文字列組み立てを query オプションへ。旧実装が送っていた createPost の `userId`(body)・deletePost の `?userId=` はバックエンドが無視していた（authmw から解決）ので送信をやめた |
| 7 | [x] | articles: `features/articles/api.ts`, `CoverImageUpload.tsx`, `PrevNextNav.tsx`, `RelatedArticles.tsx`, `RichEditor.tsx`, `features/timeline/ArticlePreviewCard.tsx` | 9 | multipart は SDK 経由の実アップロードで 200 + url 返却を確認済み（upload-image を共通ヘルパー `uploadArticleImage` に集約） |
| 8 | [x] | work-values + career-interest: `features/work-values/api.ts`, `features/career-interest/api.ts` | 6 | sessions/results/latest のみ。ai-report GET は Phase 2B。DTO型名（`ResultDTO` 等）は生成型のエイリアスとして維持（消費側12ファイル無変更） |
| 9 | [x] | job-application: `features/job-application/api.ts` | 1 | 実際は6EP（候補者4＋企業2）。`JobApplication` 型は生成型エイリアス化 |
| 10 | [x] | job-posting: `features/job-posting/api.ts` | 8 | 二形は `Array.isArray` で narrow（クエリなし=裸配列/limit付き=ラッパーを curl 実測確認）。multipart 3種は実アップロードで 200+url 確認。`JobPostingBody` は `ModelsJobPostingRequest` エイリアス化 |
| 11 | [x] | interview: `features/interview/api.ts` | 8 | propose/select の任意フィールドは `?? ""` / `?? 0` でゼロ値送信（Go デコードでは省略キーと等価、バックエンドがゼロ値にデフォルト適用するのを実装確認済み）。`status` リテラルunion型（`./types`）は既存宣言を維持してキャスト |
| 12 | [x] | scout: `features/scout/api.ts` | 18関数 | dashboard/quality/credits 含む。`unread-context.tsx` は401正常系のため**スコープ外**（上表のとおり、触っていない）。`ScoutStatus`/`level` のリテラルunion型は既存宣言を維持してキャスト。`updateTemplate` の body は全フィールド必須化（唯一の呼び出し元は常に全指定） |
| 13 | [x] | company auth register のみ: `app/company/register/page.tsx` | 1 | context は触らない（スコープ外）。エラー分岐（CONFLICT/message）は生成エラー型で維持 |
| 14 | [x] | 企業側候補者閲覧ページ群: `app/company/applications/page.tsx`, `saved-candidates/page.tsx`, `talents/page.tsx` | 各7 | 共通束は新設 `features/talent-search/api.ts` に集約（candidate detail 5EP・team scores 平均・saved 系・talent search 4種）。`TalentCard`/`Candidate` 手書き型は `ModelsTalentCard` エイリアス化。動的 `wv_*`/`ci_*` クエリはスペック未表現のためキャストで送信。companyFetch の 401→company refresh リトライは SDK インターセプタに置き換わる（他の company 系既移行機能と同じ扱い）。応募一覧の `job.teamName` 参照はスペック上存在しない dead 分岐だったため固定文言 "チーム" に（実挙動どおり） |
| 15 | [x] | 公開企業・求人ページ: `app/companies/[id]/page.tsx`, `app/jobs/page.tsx`, `app/jobs/[jobId]/page.tsx`, `app/company/profile/preview/page.tsx` | 6 | 公開2EPは新設 `features/company-profile/api.ts` に集約（SSR は `cache:"no-store"` を per-call で維持）。手書き型は `ModelsPublicCompanyProfileResponse`/`ModelsPublicTeamScoreResponse` エイリアス化。jobs/[jobId] の `benefits` 配列ガードは gateway が非nil保証（`p.Benefits = []string{}`）のため dead として削除。preview の `companyFetch("/api/company/profile")` は認証コンテキスト経由のまま（大文字Fのため完了grepにも掛からない） |
| 16 | [x] | profile 残り: `app/profile/[username]/api.ts`（follow / follow-status）, `fetchPanelData.ts`（followers/following） | 4 | upload-image と users/id は **スペック未収載 → Phase 2B（B0）**。ai-report / integrated-report 部分も Phase 2B へ残す。⚠️ follow-status は jwtMW 付きで**匿名訪問者の 401 が正常系**だったため、`FollowButton` に `isAuthenticated` ガードを追加してから移行（未ログイン時は呼ばずスペーサー表示＝従来と同じ見た目）。fetchPanelData の `as unknown as` キャスト群も削除済み |

### Phase 2B: スペック未収載エンドポイントの spec 化 → 移行

以下はフロントが使っているのに **TypeSpec に存在しない**（admin コントローラが処理する user-facing ルート）。
先に .tsp を追加し（`docs/schema-first-migration.md` の手順1〜3。**現行 JSON を curl 実測して写経**、
挙動変更ゼロ）、再生成してから FE を移行する。

| # | 状態 | 項目 | ルート |
|---|------|------|--------|
| B0 | [ ] | user 機能のスペック漏れ2ルート（schema-first 移行時からの既知の残） | `GET /api/users/id/:userId`, `POST /api/users/:username/upload-image?type=...`（multipart） |
| B1 | [ ] | integrated-report の spec 化 | `POST /api/integrated-report/requests`, `GET .../me`, `GET .../status`, `GET .../requests/:id/report`, `GET .../users/:userId/latest-request`（initializer.go の intGroup 参照） |
| B2 | [ ] | WV/CI ai-report GET の spec 化 | `GET /api/work-values/sessions/:id/ai-report`, `GET /api/career-interest/sessions/:id/ai-report` |
| B3 | [ ] | B0〜B2 対象の FE 移行 | `app/profile/[username]/AiReportCard.tsx`, `IntegratedReportModal.tsx`, `api.ts`（upload-image）, `app/integrated-report/[requestId]/*`（2ファイル）, `app/work_values/[sessionId]/WorkValuesContent.tsx`, `app/career_interest/[sessionId]/CareerInterestContent.tsx`, `fetchPanelData.ts` 残り（users/id, ai-report, integrated-report） |

再生成コマンド（B1/B2 でスペックを触ったときだけ必要）:

```bash
cd api-schema && ./scripts/generate-openapi.sh && ./scripts/generate-ts.sh
cd ../backend && make oapi && go build ./... && go vet ./... && make test
```

※ バックエンドは `server.go` に新 operation のデリゲートメソッド追加が必要になる
（`ServerInterface` 適合。admin コントローラ実装はそのまま呼ぶだけでよい）。

## 各項目の作業手順（共通）

1. 対象ファイルの fetch を読み、エンドポイント・クエリ・エラー時フォールバックを把握する。
2. `sdk.gen.ts` から対応関数を探す（無ければスペック漏れ = Phase 2B 行き。勝手に fetch のまま済ませない）。
3. パターンA/Bに従って差し替え。手書きのレスポンス型定義が `types.gen.ts` の生成型と重複していれば
   生成型の import に置き換えて削除。
4. `npx tsc --noEmit && npm run build`。
5. 挙動確認: 該当画面をローカルで踏む（バックエンド 8081 起動、`.env` の DATABASE_URL の DB。
   起動手順の詳細はメモリ「ローカルAPI検証手順」）。multipart を含む項目はアップロードを実際に実行。
6. チェックリストを更新して同じコミットに含める。

## この移行が終わったら

契約チェックループが両側で閉じるので、次の根本改善（契約クリーンアップ）に着手できる:
命名統一（camel/snake 混在の解消）、裸配列 → `{items, total}` ラッパー統一、二形レスポンス廃止、
enum 化・`@maxLength`/`@format` 追加。これらは .tsp 修正 → 再生成 → 両側のコンパイルエラー修正で
機能ごとに安全に刻める（別ドキュメント化する）。
