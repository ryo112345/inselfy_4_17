# schema-first 全面移行（TypeSpec → oapi-codegen / openapi-ts）

DB直結コントローラの経路統一（8/8完了）に続くリファクタ。手書きリクエストDTO・レスポンス構造体を
TypeSpec を単一ソースとする生成型（Go: `openapi.Models*` / TS: `types.gen.ts`）に置き換え、
FE↔BE の契約ズレをコンパイルエラーで検出できるようにする。
**どのセッションから再開しても作業が完結するように書いてある。** 2026-07-05 のインベントリ調査に基づく。

## スコープと非スコープ

- **対象:** 非 admin の 22 コントローラ・142 エンドポイント（下の進捗表）。
- **対象外:** `admin_*_controller.go`（pool直結・スペック化しない）、`stripe_webhook_controller.go`、
  `ws_controller.go`（WebSocket）。WorkValues/CareerInterest の `.../ai-report` ルートは
  admin コントローラが処理しているので対象外。
- **ルーティングは手動のまま**（initializer.go の登録を維持）。`RegisterHandlers` は使わない。
  認証ミドルウェア（jwtMW / optionalJwtMW / companyJwtMW）のルート単位適用を壊さないため。
- **フロントエンドの呼び出し側の差し替えは Phase 2（別作業）。** 本移行では生成TS型が
  `frontend/src/external/client/api/generated/` に「使える状態で揃う」ところまで。
  既存の手書き fetch は壊れない（生成は追加的）。

## 移行済みパターン（user/education/experience/skill と同じ形にする）

1機能 = 以下のセットが揃った状態:

- `api-schema/typespec/models/<feature>.tsp` — リクエスト/レスポンスモデル定義
- `api-schema/typespec/routes/<feature>.tsp` — `@route`/`@tag` 付き interface（全エンドポイント）
- `api-schema/typespec/main.tsp` に import 追加
- controller: 手書きリクエスト struct を削除し `openapi.Models<Xxx>Request` に bind
- presenter: 手書きレスポンス struct を削除し `openapi.Models<Xxx>Response` を返す
- `controller/server.go` の `Server` にデリゲートメソッド追加（`ServerInterface` 適合の
  コンパイル時チェックが目的。ルーティングには使っていない）
- initializer.go のルート登録は**触らない**（パスパラメータを typed 引数で渡す closure 形式は既存踏襲）

## 再生成コマンド（順番どおりに全部回す）

```bash
cd api-schema && ./scripts/generate-openapi.sh && ./scripts/generate-ts.sh
cd ../backend && make oapi
```

検証: `cd backend && go build ./... && go vet ./... && make test`
フロント: `cd frontend && npx tsc --noEmit`（生成TSが壊れていないか）

## JSON 等価性ルール（ここを間違えるとレスポンスが変わる）

挙動変更ゼロが絶対条件。現行の json タグと TypeSpec の対応表:

| 現行 Go（手書き） | 出力される JSON | TypeSpec での書き方 | 生成される Go |
|---|---|---|---|
| `T` タグに omitempty なし | 常に出る | `field: T`（必須） | `T` |
| `*T` + `omitempty` | nil なら**キーごと消える** | `field?: T`（optional） | `*T` + omitempty |
| `*T` omitempty なし | nil なら `null` が出る | `field: T \| null`（必須 nullable） | `*T`（omitempty なし） |
| `[]T`（常に非nil、emptySliceIfNil 等） | `[]` | `field: T[]`（必須） | `[]T` |
| `[]T`（nil をそのまま出す設計） | `null` | `field: T[] \| null` | `*[]T` 相当（生成結果を要確認） |
| `map[string]interface{}` レスポンス | キー順はアルファベット | 実キーを列挙した model | struct（キー順は変わるが JSON として等価） |

- **プロパティ名は現行の json タグと完全一致させる**（camelCase/snake_case が機能によって混在
  しているので、現行タグを写す。勝手に統一しない）。
- キーの出力順が変わるのは許容（JSON として等価）。diff 検証は `jq -S` でソートして比較する。
- PATCH の「null でクリア / 未指定で無視」を raw map デコードで実装している箇所
  （user の UpdateProfile 等）は、**デコード実装はそのまま**。生成モデルはスペック・TS型の
  ドキュメント用途になる（user が既にこの形）。
- 日時は `utcDateTime` → Go `time.Time`（RFC3339）。現行も time.Time ならそのまま等価。

## 特殊ケースの扱い（インベントリで判明した罠）

- **multipart アップロード（6箇所）:** articles/upload-image、company/profile/image、
  company/jobs の3種。TypeSpec には `@multipartBody` で記載してスペックとしては網羅するが、
  ハンドラの `FormFile` 実装は手動のまま。レスポンス `{url: string}` は共通 model 化。
- **bare array レスポンス:** `GET /api/company/scout-templates` は裸の配列を返す。
  スペックも `TemplateResponse[]` と正直に書く（ラップに変えない＝挙動変更禁止）。
- **bare domain type レスポンス:** `GET /api/users/:username/follow-status` は
  `follow.FollowStatus` を直接シリアライズ。domain の json タグを写した model を作り、
  presenter で生成型に詰め替える。
- **リクエストに domain 型が埋まっているもの:** `jobposting.TeamMember`、
  `workvalues.Response`、`careerinterest.Response`。TypeSpec に model を定義し、
  生成型 → domain 型の変換は goverter（既存の `*_request_converter.go` パターン）。
- **presenter が無い ad-hoc map レスポンス:** InterviewController（全部）、CompanyTeam の
  list/scores、TalentSearch、SavedCandidate、`{"status":"ok"}` 系。map リテラルを読んで
  キーを全部写した model を作る。**ここが一番レスポンス差分が出やすいので curl 実測で検証必須。**
- **二形レスポンス:** `GET /api/jobs`（ListPublic）は `limit>0` でページングラッパー、
  それ以外は裸のリスト。TypeSpec は union（`A | B`）で正直に記述。分岐実装は変えない。
- **動的クエリパラメータ:** talent search の `wv_<valueId>` / `ci_<typeId>`。OpenAPI では
  表現できないので、固定パラメータだけ列挙し description に動的パラメータの仕様を明記。
  パース実装は手動のまま。
- **cookie 認証レスポンス:** auth/company-auth の login/refresh はトークンを HttpOnly cookie に
  入れ、body はユーザー/企業オブジェクトのみ。スペックの response body はその形で書く
  （トークンフィールドを載せない）。
- **204 No Content** が多数（delete、follow、mark-read 等）。`@statusCode 204` の空レスポンスで記述。
- **enum:** `always-prefix-enum-values` 設定済み。生成 Go 名は `ModelsXxxYyy` 形式になる。

## 1機能あたりの手順

1. インベントリ（下表）と controller / presenter の実装を読み、全エンドポイントの
   リクエスト・レスポンス・クエリパラメータ・ステータスコードを確定する。
   **json タグと omitempty の有無を1フィールドずつ写す。**
2. `models/<feature>.tsp` と `routes/<feature>.tsp` を書き、`main.tsp` に import 追加。
3. 再生成（上記コマンド一式）。
4. controller の手書きリクエスト struct → 生成型に差し替え。domain 変換が厚ければ goverter。
5. presenter の手書きレスポンス struct → 生成型に差し替え（ad-hoc map の機能は
   presenter ファイルを新設して寄せる）。
6. `server.go` にデリゲートメソッドを追加し `ServerInterface` 適合を維持。
7. 検証: `go build ./... && go vet ./... && make test`、`npx tsc --noEmit`。
   ad-hoc map を struct 化した機能は **サーバを起動して代表エンドポイントを curl し、
   移行前レスポンスと `jq -S` で diff**（起動手順はローカルAPI検証手順のメモ参照）。
8. コミット: `refactor(api): migrate <feature> to schema-first generated types`
   （この表のチェックも同コミットに含める）。

## 進捗チェックリスト（易しい順 = 着手順）

| # | 状態 | 機能（controller） | EP数 | 主な注意点 |
|---|------|--------------------|------|-----------|
| 0 | [x] | TypeSpec ドリフト修復（user avatarUrl 等） | - | ffa6d21 済み |
| 1 | [x] | scout_settings | 2 | 小さい。scout_presenter の型を共有 |
| 2 | [x] | similar_users | 1 | inline struct、`{users,total}` ラッパー |
| 3 | [x] | team_diagnose | 2 | inline struct、204 |
| 4 | [x] | scout_template | 5 | **List が bare array** |
| 5 | [x] | notification | 8 | req body なし、204系 |
| 6 | [x] | follow | 5 | **bare domain type**（FollowStatus） |
| 7 | [x] | auth | 4 | cookie 認証、body はユーザーのみ |
| 8 | [x] | company_auth | 5 | 同上 |
| 9 | [x] | careerinterest | 4 | domain `Response` 埋め込み |
| 10 | [x] | workvalues | 4 | 同上 + Mu/SE map |
| 11 | [x] | post | 11 | goverter 済み presenter |
| 12 | [x] | scout | 7 | dashboardResponse の深いネスト |
| 13 | [ ] | candidate_scout | 6 | scout presenter 再利用 + ad-hoc map |
| 14 | [ ] | job_application | 7 | フィルタ7種の list、`{"status":"ok"}` |
| 15 | [ ] | messaging | 14 | 対称ペア、`Metadata map` |
| 16 | [ ] | article | 13 | multipart 1本、21フィールド resp |
| 17 | [ ] | company_profile | 5 | multipart、18/24フィールド |
| 18 | [ ] | saved_candidate | 6 | talentCard 再利用、ad-hoc map |
| 19 | [ ] | company_team | 11 | inline struct 7個、**nil→null 維持** |
| 20 | [ ] | talent_search | 4 | **動的 wv_*/ci_* クエリ** |
| 21 | [ ] | job_posting | 10 | 40/41フィールド、TeamMember、二形 ListPublic、multipart 3本 |
| 22 | [ ] | interview | 8 | **presenter なし・全部 ad-hoc map。curl 実測必須** |

全エンドポイントの詳細（ルート表・DTOフィールド数・特記事項）は 2026-07-05 の調査結果を
このファイルの末尾に貼らず、着手時に controller を直接読む（行番号ズレ防止）。

## Phase 2（本移行完了後の別作業・任意）

- フロントエンドの手書き fetch / 型定義を生成 sdk (`sdk.gen.ts`) / 型に段階的に差し替え
- CI に生成コードのドリフト検査を追加（backend-refactor-backlog.md の C2）
- `GET /api/jobs` の二形レスポンス解消（挙動変更になるので別議論）
