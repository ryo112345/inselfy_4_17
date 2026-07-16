# strict-server 移行＋スペック駆動認可＋Echo 除去 手順書

echo-server（非 strict）＋手動 wire ＋ミドルウェア認可の現構成を、
strict-server ＋ RegisterHandlers ＋スペック駆動認可に移行し、最終的に Echo を除去する。
**どのセッションから再開しても同じ品質で進められるよう、この手順書だけで作業が完結するように書いてある。**

## 背景と方針（決定済み・再議論しない）

### 現状の構成と課題

- oapi-codegen は `echo-server: true`（非 strict）。生成された `ServerInterface` は
  `controller/server.go` が実装しているが、**ルート登録は `driver/initializer/api/wire_*.go` の手動登録**。
  スペックとの存在一致は `spec_drift_test.go` が担保している。
- 認可は wire で per-route に付ける自作ミドルウェア5本（JWT / Company / Any / Optional / AdminAuth）。
  スペックには `security:` が143箇所定義済みなのに、検証MWは
  `AuthenticationFunc: NoopAuthenticationFunc`（`middleware/openapi_validator.go`）で認証情報を捨てている。
  → **「認証MWの付け忘れ」はビルドでもテストでも検出されない**。これが現構成の最大の穴。
- controller 39ファイルが `echo.Context` に依存（`ctx.Bind` 51箇所、`ctx.JSON`、`c.Get/Set`）。
  Echo の import は `internal/adapter/http`（47ファイル）と `internal/driver/initializer`（13ファイル）に
  完全に閉じている（depguard により domain / port / usecase への漏れはゼロ）。

### 決定事項

1. **認可はスペック駆動にする。** kin-openapi validator の `AuthenticationFunc` に JWT / AdminKey 検証を
   実装し、スペックの `security:` がそのまま認可になる。per-route 認証MWは廃止。
2. **admin API（約28ルート）も TypeSpec に載せる。** `X-Admin-Key` を apiKey securityScheme として定義。
   これで検証MW・スペック駆動認可・codegen が全ルートをカバーする。
3. **`strict-server: true` に切り替え、同時にルーターを `std-http-server`（Go 1.22 ServeMux）へ降ろす。**
   controller の書き換えは1回で済ませる（echo 向け strict を経由する二度手間はしない）。
   chi は採用しない: RegisterHandlers が全ルートを登録するため、手で書くのは異形の数本だけになり、
   グルーピングやルーターの付加機能が不要になるから。必要が生じたら後から差すのは容易。
4. **cookie を焼く認証エンドポイントは Visitor ラッパーで書く**（下記パターン集参照）。
   strict を諦める理由にしない。
5. **スペック外に残すもの:** WebSocket（2ルート）・静的配信（/api/uploads）・Stripe webhook・
   ヘルスチェック（healthz/readyz）。これらは素の `http.HandlerFunc` として手動登録し続ける。
6. **1フェーズ = 単体で main にマージ可能**を厳守。Phase 3 は wire ファイル（機能グループ）単位で刻む。
7. 各フェーズ完了時に `backend/` で `make check` 必須。挙動を変えるフェーズは E2E ＋ curl スモークも行う。

### ゴール構成

```
リクエスト
  → http.ServeMux（1.22 method+pattern）
  → net/http ミドルウェアチェーン（Recover / ロギング / OpenAPI検証＋スペック駆動認可 / CORS）
  → 生成された RegisterHandlers → strict wrapper（バインド・型付け）
  → StrictServerInterface 実装 = controller（func(ctx context.Context, req X) (Y, error)、Echo 非依存）
  → InputPort → interactor →（既存のまま変更なし）
```

`labstack/echo` は go.mod から消える。

## フェーズ一覧と進捗

| Phase | 状態 | 内容 | 単体の価値 |
|-------|------|------|-----------|
| 0 | [x] | 足場: 未pushコミットの整理・作業ブランチ | — |
| 1 | [x] | 認可のスペック駆動化（AuthenticationFunc 実装） | 認証付け忘れバグクラスの消滅 |
| 2 | [ ] | admin API の TypeSpec 契約化 | 検証・認可・codegen が全ルートに効く |
| 3 | [ ] | strict-server ＋ std-http 化（機能グループ単位で刻む） | 契約遵守のコンパイル時強制・Echo 依存の消滅 |
| 4 | [ ] | RegisterHandlers 化と後始末 | 手動ルート表の廃止・登録漏れのコンパイル時検出 |
| 5 | [ ] | レスポンス検証の有効化（test/dev） | レスポンス側の契約違反検出 |

---

## Phase 1: 認可のスペック駆動化

**目的:** `security:` を宣言したルートに自動で認証が掛かる状態にする。既存MWとの**二重化並走**で安全に移行。

1. `middleware/openapi_validator.go` の `NoopAuthenticationFunc` を実装に置き換える。
   `AuthenticationFunc(ctx, input)` で `input.SecuritySchemeName` により分岐:
   - `CandidateAuth` → 候補者 JWT 検証（既存 `port.JWTService` を利用）
   - `CompanyAuth` → 企業 JWT 検証
   - （Phase 2 以降）`AdminAuth` → X-Admin-Key 検証
   検証済みクレーム（userID / companyID）は `context.Context` の値として詰め、
   `middleware/context.go` のヘルパーを「echo.Context 版と context.Context 版の両対応」に拡張する。
2. **この時点では wire の認証MWを外さない。** 二重化のまま E2E を全て通し、
   「validator 側で 401 になるケース」「MW側で 401 になるケース」が一致することを確認する。
   複数 securityScheme の OR（`anyJwtMW` 相当）はスペック上の `security` 配列（OR 意味論）で表現できることを確認。
   `optionalJwtMW` 相当は `security: [{}, {CandidateAuth: []}]`（空要件の OR）で表現する。
3. 一致確認後、wire から per-route 認証MW（jwtMW / companyJwtMW / anyJwtMW / optionalJwtMW）を撤去。
   MW実装ファイル自体は Phase 3 で controller が `c.Get` を使わなくなるまで残す。
4. 検証: `make check`、E2E、代表エンドポイントの curl（未認証 401 / 他人 403 / 正常 200）。

**コミット例:** `feat(backend): OpenAPI security 定義による スペック駆動認可を導入`

**注意:** admin ルートはまだスペック外なので、`adminAuthMW` はこのフェーズでは現状維持。

**実施メモ（2026-07-16 完了、コミット b2bdacf / dddf4c7）:**
- kin-openapi v0.140.0 は security の OR を**宣言順に逐次評価**し最初に通った要件で成功。
  空要件 `{}` は無条件成功 → optional 認証は `security: [{CandidateAuth}, {}]` で表現できることを
  ユニットテスト・curl 両方で確認済み（PoC 懸念は解消）。
- 一致確認は E2E ではなく **wire MW × spec security の静的突き合わせスクリプト**で実施し、
  143 operation 全一致・スペック外は healthz/readyz/stripe webhook/ws/uploads/admin のみと確認。
  （既存 Playwright E2E 12/13 件はデモデータ依存で移行前から失敗しており判定に使えない）
- 検証済みクレームは echo context（`c.Set`、既存 controller 互換）と request context
  （`UserIDFromContext` / `CompanyIDFromContext`、Phase 3 の strict handler 用）の両方に publish。
- ⚠️→✅ 別件で IDOR を発見・修正済み（コミット 8a7e0de）: `PATCH /api/users/:username` 等
  wire_user 系（user/experience/education/skill の書き込み）は認証のみで本人一致チェックが無く、
  有効な候補者トークンで他人の username をパスに入れれば他人のプロフィール等を改ざん/削除できた。
  experience/education の既存所有者チェックは対象を**パスの username** で解決していたため実質無効だった。
  修正: 認証済み userID を interactor へ渡し、パス解決ユーザーの ID と不一致なら 403。
  company 側は `:companyId` パスを取らず常に認証済み companyID で照合するため影響なし。
  さらに全書き込み系を横断監査し、通知の既読化 `MarkAsRead(id)` に同種の穴を発見・修正
  （コミット 047988f、SQL を owner スコープ化）。他（messaging/article/job_application/
  scout/saved_candidate/follow/scout_settings）は認証済み principal と照合済みで安全と確認。

## Phase 2: admin API の TypeSpec 契約化

**目的:** 約28の admin ルートを公開契約に載せ、Phase 3-4 の対象にする。

1. TypeSpec に `AdminAuth`（apiKey, header: `X-Admin-Key`）securityScheme を追加。
2. `spec_drift_test.go` の `unspeccedRoutes` にある admin ルート一覧を正として、
   admin の operation を TypeSpec に追加していく。既存レスポンスの形（実装が正）に合わせ、
   スペックを直してから実装を直す事故を避ける（curl で現物を確認しながら書く）。
3. `unspeccedRoutes` から `"* /api/admin/*"` を削除 → ドリフトテストが admin もカバーする。
4. Phase 1 の `AuthenticationFunc` に `AdminAuth` 分岐を実装し、`adminAuthMW` と二重化→撤去。
5. **フロント SDK への影響を確認:** openapi-ts の生成物に admin operation が混ざる。
   管理画面は同 SDK を使ってよい（むしろ手書き fetch が減る）。混ぜたくない場合は
   openapi-ts の filter でタグ除外する（判断は実施時に。デフォルトは「混ぜる」）。
6. 検証: `make check`、ドリフトテスト、admin 管理画面の手動スモーク（一覧・承認以外の操作）。

**コミット例:** `feat(api): admin API を TypeSpec 契約に追加`（spec）＋ `refactor(backend): admin 認可をスペック駆動へ移行`

## Phase 3: strict-server ＋ std-http 化（最大の山）

**目的:** controller を Echo 非依存の純関数にし、バインド/シリアライズを生成コードに吸わせる。

### 3-0. 生成設定の切り替えと土台

1. `oapi-codegen.yaml` を変更:
   ```yaml
   generate:
     std-http-server: true
     strict-server: true
     models: true
   ```
   `make generate` で `StrictServerInterface` ＋ std-http 用 `RegisterHandlers` を生成させる。
   ※ この時点では新生成コードは**誰も参照しない**（ビルドは通る）。旧 `echo-server` 生成物と
   併存できない場合は、移行期間中だけ出力を2ファイルに分けて両方生成する
   （`server.gen.go` = echo / `server_strict.gen.go` = std-http。Makefile に2回目の呼び出しを追加）。
2. net/http 版ミドルウェアを用意する（`adapter/http/middleware/` に併設）:
   - OpenAPI 検証＋認可: `oapi-codegen/nethttp-middleware`（既製）に Phase 1 の AuthenticationFunc を移植
   - ロギング: `RequestLogging` を `func(http.Handler) http.Handler` に移植（Cloud Trace 相関は維持）
   - Recover / CORS: 小さな自作 or `rs/cors`。Echo の `echomw` 相当は数十行で書ける
3. cookie 用 Visitor ラッパーと共通ヘルパーを `adapter/http/controller/` に追加（下記パターン集）。

### 3-1. 機能グループ単位の移行（1グループ = 1コミット）

wire ファイル単位で刻む。各グループで:
controller のメソッドを `StrictServerInterface` のシグネチャに書き換え → `server.go` の委譲を strict 版に差し替え。

| # | 状態 | グループ | 備考 |
|---|------|---------|------|
| 1 | [ ] | wire_user（user/experience/education/skill/follow/similar） | 手動ルート22本と最多。練習台に最適な単純CRUD群 |
| 2 | [ ] | wire_content（post/article） | 記事画像アップロード = multipart の初出 |
| 3 | [ ] | wire_search | QueryService 読み取りのみ |
| 4 | [ ] | wire_diagnosis（WV/CI/チーム診断） | anyJwt 相当の OR security を実地確認 |
| 5 | [ ] | wire_auth ＋ company 側 auth | **cookie Visitor ラッパーの本番**。login/logout/refresh |
| 6 | [ ] | wire_company | 企業プロフィール画像アップロードあり |
| 7 | [ ] | wire_scout | |
| 8 | [ ] | wire_jobs | 求人票PDF・写真アップロード |
| 9 | [ ] | wire_messaging | |
| 10 | [ ] | wire_interview | SetWS 連携あり。HTTP 部分のみ strict 化、WS は対象外 |
| 11 | [ ] | wire_admin | Phase 2 完了が前提。PDF ダウンロード = バイナリレスポンスの本番 |

**移行中の併存のさせ方:** 移行済みグループは新しい std-http mux 側に、未移行グループは Echo 側に登録し、
`main.go` で「まず mux で試行 → 未登録なら Echo へフォールバック」する薄いディスパッチャを噛ませる
（`mux.Handler(r)` でパターン一致を判定）。全グループ完了までフロントからは1サーバーに見える。

### 3-2. 各グループの手順

1. 移行前に代表エンドポイントのレスポンス JSON を curl で記録（移行後の比較用）。
2. controller メソッドを strict シグネチャへ:
   - `ctx.Bind(&body)` → 削除（`req.Body` に型付きで入ってくる）
   - `ctx.Param/QueryParam` → 削除（`req.Params` / パス引数に型付きで入ってくる）
   - `ctx.JSON(200, x)` → `return X200JSONResponse(x), nil`
   - `c.Get(UserIDKey)` → `middleware.UserIDFromContext(ctx)`（Phase 1 で用意した context.Context 版）
   - エラー: 既存の共通エラーハンドラ依存をやめ、スペック定義済みのエラーレスポンス型
     （`X401JSONResponse` 等）を明示的に返す。未定義の内部エラーのみ `return nil, err`
     （strict wrapper の ErrorHandler で 500 JSON に変換）
3. presenter / goverter converter の出力型を生成モデルに合わせて再配線
   （型名が変わるだけ。`make goverter` で再生成、漏れはコンパイルエラーで検出）。
4. `server.go` の該当部分を `StrictServerInterface` 実装に差し替え、wire の該当ルートを Echo から撤去。
5. 検証: `make check` → 記録済みレスポンスと diff → 該当機能の E2E。

### 3-3. パターン集

**cookie（auth 系のみ）:** レスポンス型の Visit を包む共有ラッパーを使う。
```go
type withCookies[T VisitableResponse] struct {
    inner   T
    cookies []*http.Cookie
}
func (r withCookies[T]) VisitXxxResponse(w http.ResponseWriter) error {
    for _, c := range r.cookies { http.SetCookie(w, c) }
    return r.inner.VisitXxxResponse(w)
}
```
（Visit メソッド名が operation ごとに異なるため、実際には auth 系4〜6 operation 分だけ個別に書く。
汎用化しようとして reflection に走らない — 数本なら手書きが読みやすい。）

**multipart アップロード:** strict は `*multipart.Reader` を渡してくる。
`r.NextPart()` でファイルパートを取り出す小ヘルパー（`readFilePart(reader, fieldName)`）を1つ作り共用。

**バイナリダウンロード（PDF等）:** `XxxApplicationpdfResponse{Body: io.Reader, ContentLength: n}` を返すだけ。

**スペック外ルート（WS/静的/webhook/health）:** `RegisterHandlers` の後に mux へ手動登録:
```go
mux.Handle("GET /api/uploads/", http.StripPrefix("/api/uploads/", http.FileServer(...)))
mux.HandleFunc("GET /api/ws", wsCtrl.HandleWS)  // net/http シグネチャに書き換え
```

### 3-4. Echo 除去（全グループ完了後）

1. フォールバックディスパッチャを撤去し、mux 一本化。`e.Start` → `http.Server`（timeouts 明示）。
2. echo 版ミドルウェア・`middleware/context.go` の echo 版ヘルパー・旧 `server.gen.go`（echo 生成物）を削除。
3. `go mod tidy` で `labstack/echo` が消えることを確認。
4. `.golangci.yml` の depguard から echo 許可を外し、**echo を import したら落ちる**側に倒す。
5. 検証: `make check`、E2E 全件、`docs/screenshots` の再撮影フロー（README 手順）で主要画面を目視。

**コミット例:** `refactor(backend): <group> を strict-server ハンドラへ移行` × 11 ＋ `refactor(backend): Echo を除去し net/http に一本化`

## Phase 4: RegisterHandlers 化と後始末

Phase 3 のフォールバック構成で実質完了しているが、仕上げとして:

1. wire_*.go を「DI 組み立て（controller 群の構築）だけ」に縮小。ルート登録は
   `RegisterHandlers(mux, strictHandler)` ＋ スペック外の手動数本のみに。
2. `spec_drift_test.go` を縮小: 「スペック→ルーター」方向は RegisterHandlers が
   コンパイル時に保証するため削除。「ルーター→スペック」方向（allowlist 検査）のみ残す
   （スペック外ルートの増殖を理由必須で管理し続けるため）。
3. lefthook の pre-push ドリフト検査（`2ba8b56` で導入）が新構成でも機能することを確認。
4. CLAUDE.md・`docs/backend-refactor-backlog.md` #8 を新構成に合わせて更新
   （「RegisterHandlers は意図的に未使用」の記述を撤回し、本手順書へのリンクに置き換え）。

**コミット例:** `refactor(backend): RegisterHandlers へ一本化しドリフト検査を縮小`

## Phase 5: レスポンス検証の有効化

1. kin-openapi の response validation を **test / dev のみ**で有効化する
   ミドルウェアを追加（本番はレイテンシとメモリの都合で off。環境変数でスイッチ）。
2. E2E を一巡し、値レベルの契約違反（enum 外の値・nullable 違反など strict の型では防げないもの）を
   洗い出して修正。
3. 検証: `make check` ＋ E2E（response validation on の状態で全通し）。

**コミット例:** `test(backend): dev/test でのレスポンス契約検証を追加`

## リスクと対処

| リスク | 対処 |
|--------|------|
| Phase 3 の長期化・ビッグバン化 | フォールバックディスパッチャによる併存で、グループ単位 main マージを維持 |
| 認可の挙動差（MW → AuthenticationFunc） | Phase 1-2 の二重化並走で一致確認してから撤去 |
| レスポンス形の意図せぬ変化 | グループごとに移行前 curl 記録との diff を必須化 |
| optional 認証の表現漏れ | スペックの `security: [{}, {...}]` で表現できるか Phase 1 で最初に PoC する。不可なら該当ルートのみ手動MW残置を許容し、本手順書に追記 |
| フロント SDK の破壊 | スペック変更は additive のみ（admin 追加）。既存 143 operation のスキーマは変えない |

## 検証コマンド早見

```bash
cd backend && make check          # build + lint + test（全フェーズ必須）
cd backend && make generate       # スペック変更後の再生成一式
cd frontend && npm run e2e        # 挙動を変えるフェーズで実行
```
