# 認証 refresh の構造修正バックログ（企業側 refresh 経路・rotation 方式）

orval 移行 Phase 3（`docs/frontend-data-layer-roadmap.md`）の作業中に発見した、
refresh まわりの構造問題の修正計画。**どのセッションから再開しても作業が完結するように書いてある。**
2026-07-17 のコードベース調査に基づく（行番号は当時のもの。着手時にズレていたら読み替える）。

**進捗（2026-07-17）: 修正1・修正2・修正3 すべて実装・検証済み。本ドキュメントのバックログは完了。**

- 修正1: per-token rotation 化（`RevokeByID`）、interactor ユニットテスト2件追加、`make check` PASS
- 修正2: `refresh.ts` を realm 対応化（`refreshToken(realm)`・`realmForApiPath`・`LOGIN_PATH`）、
  mutator / interceptor のパス判定・リダイレクト分岐、company-auth-context の
  `refreshPromiseRef` 廃止（共有 refresh + `/me` 再取得）。e2e は企業版 refresh テストと
  領域別リダイレクトテストを追加し全19件 PASS。`--repeat-each` 並列制約の解消も
  `--repeat-each=3 --workers=3` で実証済み

## 背景（発見の経緯と修正済み分）

Phase 3-0 の「refresh 成功→リトライ」e2e を書いたことで、refresh の同時実行が
ローテーションと衝突する競合を発見し、候補者側は修正済み（コミット d39cf1b）:
`frontend/src/external/client/api/refresh.ts` に in-flight 単一化した `refreshToken()` を置き、
hey-api interceptor / orval mutator / auth-context の3者で共有している。

その調査の副産物として、同じファミリーのより大きい問題が2つ残っている。

**破壊性の核はバックエンドの2点セット:**
1. rotation が「その主体の**全** refresh トークン失効」（`RevokeByUserID` / `RevokeByCompanyID`）
2. refresh 失敗時に 401 + **Cookie 全消去**（`clearedAuthCookies`）で応答する

この組み合わせにより「使用済み（または他端末で失効済み）トークンでの refresh」が
即・強制ログアウトになる。

## 修正1: rotation を per-token 方式にする（バックエンド・先にやる）

### 現状と問題

- `backend/internal/usecase/auth_interactor.go:91` — `RevokeByUserID(rt.UserID)`
- `backend/internal/usecase/company_auth_interactor.go:105` — `RevokeByCompanyID(rt.CompanyID)`

refresh のたびに全トークンを失効させるため、実質シングルセッション:

- 候補者がスマホ + PC でログイン → 片方が refresh した瞬間、もう片方の refresh_token が死ぬ
  → アクセストークン（24h）失効後の再訪で強制ログアウト
- 企業アカウントは複数の採用担当者で共有し得るため、**担当者Aの refresh が他の担当者全員を飛ばす**

### 修正方針

使った1本だけ revoke し、新しい1本を発行する（per-token rotation）。

- スキーマは変更不要。`refresh_tokens` は行単位の `revoked_at` を既に持つ
  （`backend/migrations/20260419000001_add_auth_columns.up.sql`。企業側 20260422 も同様の想定、要確認）
- `port.RefreshTokenRepository`（`backend/internal/port/auth_port.go:16`）に
  `RevokeByID`（または `RevokeByTokenHash`）を追加し、interactor の
  `RevokeByUserID` 呼び出しを置き換える。企業側（`port/company_port.go:27`）も同様
- sqlc クエリ追加 → `make sqlc` で再生成
- `GetByTokenHash` が revoked/expired を弾くことを確認（再利用は引き続き 401）
- ログアウト時の全失効（あれば）は `RevokeByUserID` を残して使い分ける
- **任意（今回はやらない選択も可）:** 再利用検知で家族ごと失効させるトークンファミリー方式。
  per-token 化だけでもセキュリティ水準は「再利用トークン単体は無効」で維持される

### 検証

- `cd backend && make check`
- ユニット: 2本発行 → 片方で refresh → もう片方がまだ有効、を interactor テストで確認
- e2e: `frontend/e2e/orval-mutator-check.spec.ts` の refresh テストが引き続き PASS。
  修正後は同テストの「--repeat-each 並列不可」制約が消えるはず（コメントも更新する）

## 修正2: mutator/interceptor に企業側 refresh 経路を追加（フロント・横展開の前提）

### 現状と問題

- `frontend/src/external/client/api/refresh.ts:12` — refresh 先が候補者用
  `/api/auth/refresh` **固定**。orval mutator（`orval/custom-fetch.ts`）と hey-api
  interceptor（`client.ts`）は両方これを使う
- リダイレクト先も `/login`（候補者ログイン）固定。`/company/login` は別に存在する

企業ページの SDK 呼び出し（移行済みの talents / applications / saved-candidates を含む）が
401 になると: 候補者 refresh を叩く → 企業セッションには候補者 refresh_token が無く必ず失敗
→ 有効な `company_refresh_token` があるのに silent refresh されず、**候補者用 /login に飛ばされる**。

現状の緩和は company-auth-context の手書き `companyFetch`
（`frontend/src/features/company-auth/company-auth-context.tsx:64` の `refreshPromiseRef`）が
企業 refresh を持っていること。ただし SDK 経由の呼び出しはこれを通らず、
CompanyAuthGuard の refresh が SDK の 401 より先に完了するかのレース頼み。
さらに **companyFetch ベースのページ（teams / profile / messages 等）を orval に移行すると
この命綱ごと消える**ため、本修正は Phase 3 横展開の前提条件。

### 修正方針

- `refresh.ts` を領域対応にする:
  - `refreshToken(realm: "user" | "company")` の形にし、単一飛行を領域ごとに持つ
  - 企業側は `/api/company/auth/refresh` を叩く
- mutator / interceptor は**リクエストパスで領域判定**する
  （`/api/company/` プレフィックス → company。admin はスコープ外のまま）。
  リダイレクト先も領域で分岐: user → `/login`、company → `/company/login`
  （無限ループ除外の pathname 判定も両方のログインパスを除外する）
- company-auth-context の `refreshPromiseRef` を廃止し、共有 `refresh.ts` を使う
  （分裂したままだと、企業側 rotation でも d39cf1b と同じ破壊的競合が起きる。
  ただし context は refresh 応答の body で `setCompany` しているため、
  共有化の際は「refresh 成功 → `/api/company/auth/me` を再取得して setCompany」に変える）

### 検証

- `orval-mutator-check.spec.ts` に企業版テストを追加:
  `company_token` Cookie だけ消して `company_refresh_token` を残す →
  企業ページ/生成フック呼び出しで 401 → 企業 refresh 200 → リトライ成功・リダイレクトなし
- 未ログインで企業ページの SDK 呼び出し → `/company/login` へ飛ぶこと
- 既存の候補者側 4テストが引き続き PASS
- `npx tsc --noEmit && npx biome check` / e2e 全スイート

## 修正3（2026-07-17 完了）

- **auth 系の生 fetch を生成クライアントへ一本化（実装済み）:** auth-context /
  company-auth-context / `features/auth/viewer.ts` の生 fetch を orval 生成クライアント
  （mutator + `skipAuthRedirect`）に置き換えた。401→refresh→リトライは mutator が共有
  refresh.ts 経由で行うため、両 context の手書き refresh フロー（company-auth-context の
  `refreshSession` / auth-context の refresh 分岐）は削除。companyFetch は全ページの
  orval 移行（company/teams・company/profile 群・CompanyHeader・useCompanyProfile・
  company/jobs/[jobId]）と同時に context から撤去した。viewer.ts は Cookie を明示ヘッダで
  渡す `authGetMe` 呼び出しに置換（SSR では mutator の 401 分岐が発動しないため
  「refresh しない」契約は維持）。
  検証: tsc / biome クリーン、e2e 19本 PASS、企業ページ実ブラウザスモーク
  （login → teams 一覧/詳細 → profile 編集/プレビュー → 求人編集の PUT 200）
- **identity cookie（userId / username）:** SSR フォールバックとして現役使用中
  （`viewer.ts` の `getUsernameFromCookie`、`app/page.tsx` ほか）。displayName cookie は
  廃止済み（backend-refactor-backlog #9）。me エンドポイント一本化で将来的に廃止可。優先度低

## 順序

**修正1（バックエンド）→ 修正2（フロント）→ Phase 3 横展開再開 → 修正3。**
修正1を先に入れると、修正2の e2e 検証が並列実行の罠なしで書ける。
どちらも API 契約（OpenAPI スペック）は変わらないため、TypeSpec / 生成物への影響は無い。
