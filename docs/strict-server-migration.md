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
| 2 | [x] | admin API の TypeSpec 契約化 | 検証・認可・codegen が全ルートに効く |
| 3 | [~] | strict-server ＋ std-http 化（3-1 全11グループ移行完了・残りは 3-4 Echo 除去） | 契約遵守のコンパイル時強制・Echo 依存の消滅 |
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

**実施メモ（2026-07-16 完了、コミット be06490 / cab9319）:**
- admin ルートは全29本（`models/admin.tsp` / `routes/admin.tsp`）。レスポンス形は実装準拠で
  snake_case 混在（`api_key_prefix` 等）・企業系のみ camelCase という現物の不揃いをそのまま契約化した。
  公開 API の camel 統一命名には**寄せていない**（互換優先。揃えるならフロント管理画面と同時変更）。
- `@useAuth(Models.AdminAuth)` は interface レベル1箇所で全 operation に効く（生成 YAML で29本全てに
  `security: [{AdminAuth: []}]` が付くことを確認済み）。
- スペック追加と同時に生成 `ServerInterface` が29メソッド増え `server.go` の適合が壊れるため、
  委譲メソッド追加＋validator の AdminAuth 分岐は**同一コミットに含めた**（スペックだけ先行させると
  AuthenticationFunc が未知スキームで全 admin ルートを 401 にする）。
- AdminAuth 分岐は旧MWと同挙動: X-Admin-Key ヘッダーのみ（Bearer 代替なし・ユニットテストで固定）、
  静的キー→個人トークン(SHA-256) の順、fail-closed、TouchAdminLastUsed と監査ログ注釈
  （`admin_auth=static_key|personal_token`、アクセスログで確認済み）も validator 側へ移植。
- 副次的な改善: admin のクエリ/パス/ボディも契約検証されるようになった
  （例: `per_page=abc` は従来デフォルト値で握り潰し→現在は 400）。
- フロント SDK は admin operation を「混ぜる」を採用（tsc クリーン確認済み）。
- 手動スモーク: 未認証/不正キー 401・静的キー 200・個人トークン 200（発行→使用→last_used_at 更新→削除）。

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
| 1 | [x] | wire_user（user/experience/education/skill/follow/similar） | 完了（677504d / 0268068）。手動ルート22本と最多 |
| 2 | [x] | wire_content（post/article） | 完了（e58ea04）。Stripe webhook はスペック外で echo 残置 |
| 3 | [x] | wire_search | 完了（45fa180）。衝突・スペック補正なしの最小ケース |
| 4 | [x] | wire_diagnosis（WV/CI/チーム診断） | 完了（8bc2b97）。OR security は validator 責務のまま実地確認済み |
| 5 | [x] | wire_auth ＋ company 側 auth | 完了（2c66067）。cookie Visitor ラッパー・RequestIntoContext 導入 |
| 6 | [x] | wire_company | 完了（fec8b84）。24ルート・チーム系5 op に 403 補正 |
| 7 | [x] | wire_scout | 完了（22addd3）。21ルート・409/403/404 のスペック補正 |
| 8 | [x] | wire_jobs | 完了（d3fed30）。18ルート・画像アップロード3本を strict multipart 化 |
| 9 | [x] | wire_messaging | 完了（b43e511）。22ルート・会話開始の 409 スペック補正 |
| 10 | [x] | wire_interview | 完了（b75e535）。8ルート・403×3 スペック補正・WS は対象外のまま |
| 11 | [x] | wire_admin | 完了（b64e830）。28ルート・embed 撤去＝コンパイル時適合 復活。PDF ダウンロードは本リポジトリに存在せず（想定空振り） |

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

**実施メモ（2026-07-16、3-0 完了 962643f・グループ1完了 677504d / 0268068）:**

- **3-0 は「併存生成」ではなく一本切替にした。** echo-server と std-http-server の生成物は
  `ServerInterface` / `ServerInterfaceWrapper` / `RegisterHandlers` 等の識別子が衝突し、
  同一パッケージでの2ファイル併存は不可能（別パッケージ分割はモデル型が二重化し presenter が
  死ぬので不採用）。幸い echo 生成物はルーティングに未使用（`controller/server.go` は適合チェック
  専用で `NewServer` の呼び出しゼロ）だったため、strict+std-http+models に切り替えても壊れるのは
  server.go だけ。同ファイルは削除し、`StrictServer`（`StrictServerInterface` を embed）へ
  グループごとに実装を差す方式にした。**embed が残っている間はコンパイル時適合が無い**ので、
  全グループ完了時に embed を外して `var _ openapi.StrictServerInterface` を復活させること。
- **ディスパッチャは main.go ではなく echo ミドルウェア**（`dispatchToStrict`、initializer の
  `strict_router.go`）。既存の Recover / RequestLogging / OpenAPI 検証 / CORS チェーンが移行済み
  ルートにもそのまま効くため、net/http 版ミドルウェアの移植は 3-4 まで不要になった（3-0 手順 2 は
  先送り）。検証済みクレームは request context 経由で strict handler に届く（Phase 1 の両対応が効いた）。
- **Go 1.22 ServeMux には echo の static-over-param 優先が無い**: `GET /api/users/id/{id}` と
  `GET /api/users/{username}/experiences` は「どちらも /api/users/id/experiences にマッチし
  優劣なし」で登録時 panic。strictRouter を2段 mux にし、衝突するルートは priority mux
  （`handleFirst`）で先に照合して echo の挙動を再現した。
  ⚠️ **Phase 4 への影響:** 生成 `RegisterHandlers`（HandlerWithOptions）も同じ理由で panic する。
  `StdHTTPServerOptions.BaseRouter` に2段 mux 相当の独自ルーターを渡すか、スペックのパス設計
  （/api/users/id/*）の変更を検討すること。
- **strict 化は「実装は返すがスペックに無いエラー」をコンパイルで炙り出す。** user グループでは
  所有者チェックの 403 が 6 operation で未宣言だった → ForbiddenError を additive 追加
  （677504d、フロント SDK への影響はエラー型の追加のみ・tsc クリーン）。以降のグループでも
  同種のスペック補正が出る想定。レスポンス変更は必ず「実装が正、スペックを合わせる」方向で。
- **PATCH /api/users/{username} は strict を経由しない例外**（手書き net/http ハンドラ
  `UpdateProfileHTTP`）。absent（触らない）と明示 null（クリア）を区別する raw JSON デコードが
  strict の事前デコード済みボディでは表現できないため。契約検証は上流 validator が担保。
  同種の PATCH セマンティクスを持つ operation が他グループに現れたら同じ例外パターンを使う。
- エラーマッピングは `handleError` の分類を `errorStatus(err) int` に抽出し、echo 版と strict 版
  （operation ごとの typed response への振り分け）で共用。500 だけは `return nil, err` →
  `WriteResponseError`（`{code:"INTERNAL"}`、従来と同形）。
- 検証: `make check` に加え、移行前後で 36 ケースの curl スモーク（正常系・401/403/404/409/400・
  multipart・書き込みサイクル）を取り全一致を確認。E2E は移行前からデモデータ依存で失敗しており
  判定に使えない（Phase 1 メモ参照）ため、以降のグループも同様の前後スモーク比較を必須とする。
  スモークは `backend/scripts/strict-smoke/` に置く（lib.sh = 共通ヘルパー・dev データ復旧の検証付き、
  user_group.sh = グループ1の実例、diff_bodies.py = 揮発フィールド正規化つき前後比較）。
  新グループ移行時は user_group.sh を雛形に <group>.sh を追加し、
  「移行前に実行 → 移行後に実行 → diff_bodies.py で 0 diffs」を確認する。
  書き込みケースが dev データを汚す場合は必ずスクリプト末尾で復旧し cleanup_check で検証すること
  （グループ1では復旧漏れが偽差分として出て切り分けコストになった教訓）。
- 微差: strict/手書きハンドラの Content-Type は `application/json`（echo は
  `application/json; charset=UTF-8`）。ボディは同一。

**実施メモ（2026-07-16、グループ2完了 e58ea04）:**

- ServeMux の曖昧衝突が posts でも発生: `GET /api/posts/users/{userId}` と
  `GET /api/posts/{postId}/comments` は `/api/posts/users/comments` が両方にマッチし登録時 panic。
  グループ1と同じく priority mux（`handleFirst`）で解決。**静的セグメントとワイルドカードが
  同位置で衝突する組み合わせはグループごとに登録時 panic で発覚する**ので、テスト
  （spec_drift_test が registerRoutes を呼ぶ）を回せば見逃しはない。
  なお `/api/articles/mine` vs `/api/articles/{articleId}` は「mine が strict subset」なので
  ServeMux が静的優先で解決でき、priority mux 不要。
- multipart の初出: `readFilePart` をパートの Content-Type も返すよう拡張。
  記事画像アップロードは移行前の「`image/*` 判定 → 400 'only image files are allowed'」
  「拡張子なしファイル名は Content-Type から補完」ロジックをそのまま維持
  （user グループの拡張子ホワイトリスト方式とは歴史的に別ロジック。統一はしない＝挙動維持優先）。
- 記事の optional 認証（`security: [{CandidateAuth}, {}]`）は `UserIDFromContext(ctx)` の
  空文字判定で表現（cookie ありなら isAuthor / purchased が変わることをスモークで確認）。
- 今回はスペック補正ゼロ。ErrNotAuthor は既存分類どおり 400（スペックに 403 も宣言済みだが
  未使用のまま。実装が正の方針に従い温存）。著者以外の削除は 404（owner 不一致を ErrNotFound に
  丸める既存実装のまま）。
- スモークは 55 ケース（posts 24 / articles 25 / 企業記事 6 相当）で前後 0 diffs。
  `diff_bodies.py` の VOLATILE に `publishedAt` / `postId` を追加し、記事画像の
  フル UUID ファイル名も正規化対象に追加（作成リソースの ID がボディに現れる偽差分対策）。
- Stripe webhook（`POST /api/stripe/webhook`）は echo 残置のまま署名エラー 400 応答を確認
  （ディスパッチャのフォールバックが機能）。

**実施メモ（2026-07-16、グループ3完了 45fa180）:**

- 全5ルート静的パスで ServeMux 衝突なし・スペック補正なし・書き込みなしの最小ケース。
  前後スモーク search_group.sh は 15 ケース 0 diffs（復旧処理不要）。
- validator の minLength/maxLength では弾けない「trim 後空文字（空白のみの q）」だけは
  controller 側の従来チェックを維持（`q must be 1-100 characters` の 400）。
  同様に limit/offset/limitPerType の範囲外→デフォルト値の丸めも controller 責務のまま。

**実施メモ（2026-07-16、グループ4完了 8bc2b97）:**

- **OR security（読み取り＝CandidateAuth or CompanyAuth）は strict 化の影響を受けない**。
  認可は上流 validator（Phase 1）の責務で、controller は principal を読むだけ。
  候補者 cookie / 企業 cookie / 未認証の3態を前後スモークで確認（200/200/401 一致）。
  チーム診断6ルートはスペック上 security なし（パスの招待トークンが認可）で、これも挙動不変。
- ServeMux 衝突なし（work-values/career-interest は第2セグメントが常にリテラル、
  team-diagnose は {token} 起点でその後のリテラルが分岐するため曖昧にならない）。
- スモークの学び:
  - WV の有効提出（201）は BT 推定の μ をクライアント側で再現する必要がありスクリプト化しない
    （エラー経路 400/403/401 のみ）。CI は固定60問・検証が決定的なので有効提出まで踏み、
    作成した WV/CI セッション・結果・スコアは末尾で DB 削除し件数一致を検証する。
  - 移行前の記録で「in-progress セッションへの WV AIレポート依頼が 404 ではなく 204」と判明
    （手順書の想定と違ったが実装が正。挙動は維持）。
  - WV initialPairs / CI セッション items は時刻シード RNG で毎回変わる仕様のため
    diff_bodies.py で揮発扱いに（items は {items,total} リスト形と衝突しないよう
    「total を伴わない items のみ」揮発）。
- gitleaks が smoke スクリプト内の seed 招待トークン（48hex）を generic-api-key と誤検知して
  pre-commit をブロック。値は scripts/seed.sql 既収載のデモデータだが、ハードコードをやめ
  実行時に DB から引く方式に変更して解消（allowlist は増やさない）。

**実施メモ（2026-07-16、グループ5完了 2c66067）:**

- **cookie Visitor ラッパー（3-3 パターン）は想定どおり6 operation 分の個別実装で足りた**
  （google login / 候補者 refresh / 候補者 logout / 企業 login / 企業 refresh / 企業 logout）。
  cookie 構築は `[]*http.Cookie` を返すビルダー（authCookies / clearedAuthCookies /
  companyAuthCookies / clearedCompanyAuthCookies）に分離し、echo 残置の admin
  bypass-login 2本もこのビルダーを共用する形に呼び替え（グループ11で再利用できる）。
- **strict 署名に現れない入力（リクエスト cookie・scheme）は StrictMiddlewareFunc で解決**:
  `RequestIntoContext` が *http.Request を context に入れ、handler は
  `cookieValue(ctx, "refresh_token")` / `isSecureRequest(ctx)`（echo の `Scheme()=="https"`
  相当を再現。Cloud Run の X-Forwarded-Proto 対応）で読む。ミドルウェアは全 operation に
  掛かるが WithValue 1個なのでコストは無視できる。
- **移行前スモークで既存バグを発見・先行修正（8e26cf6）**: 失効した企業 refresh cookie が
  500 INTERNAL になっていた（`handleCompanyAuthError` が `auth.ErrRefreshTokenRevoked` を
  分類しておらず handleError に落ちていた。候補者側は 401）。スペックは 401 宣言済みのため
  「実装のバグ」と判断し、移行前に echo 版を修正してから前後比較の基準にした。
- **スペック補正（実装が正・additive）**: 企業 login の 403（code:
  `ACCOUNT_PENDING` / `ACCOUNT_REJECTED`）が未宣言だった → `CompanyAccountStatusError` を
  追加。フロント SDK 再生成で tsc クリーン。
- 微差（意図的）: refresh の内部エラー（DB 障害等）経路は echo 時代 cookie clear ＋500 だったが、
  strict では `nil, err` 経路のため clear しない（一時障害でログアウトさせない方が正しい。
  失効トークンの 401 時は従来どおり clear）。refresh 中のユーザー/企業消滅による 404 は
  FK ON DELETE CASCADE（refresh トークン行ごと消える）により実質到達不能で、strict では
  500 扱いに整理した。
- ServeMux 衝突なし（9ルート全て静的パス）。
- スモークは auth_group.sh 25ケースで前後 0 diffs。**Set-Cookie の名前・属性（値はマスク）の
  比較を diff_bodies.py に追加**した（このグループはボディよりヘッダーが本体のため）。
  候補者 refresh はローテーション（全失効→新規発行）するため、スクリプトが既存の生存
  refresh トークン id を事前記録し末尾で revoked_at を復元・テスト中に作った行を削除する。
  企業側は register で作った pending アカウントを psql でステータス遷移させ
  403 pending / 403 rejected / 200 approved の3態を踏んでから削除する。

**実施メモ（2026-07-16、グループ6完了 fec8b84）:**

- 24ルート・4コントローラ（profile / teams / talent search / saved candidates）と、
  グループ内では最大。ServeMux 衝突なし（saved-candidates の count / bulk-check は
  {userId} の strict subset なので静的優先で解決）。
- **スペック補正（実装が正・additive）**: `verifyTeamOwner` を通る5 operation
  （addTeamMember / removeTeamMember / getTeamScores / setAceMember / unsetAceMember）に
  403 を追加（既存 alias `AuthedForbiddenErrors` へ変更するだけ）。
  get/update/deleteTeam は SQL で (teamId, companyId) スコープしており他社チームは
  404 になるため 403 補正は不要 — **同じ「他社リソース」でも実装方式でステータスが
  分かれている**（横断修正はしない・挙動維持）。
- controller の `uuid.Parse` ガード（"invalid company id" 等の 400）は全て削除した。
  パスパラメータは上流 validator の Uuid pattern が先に 400 を返し、companyID は
  検証済み JWT 由来のため**全て到達不能な死にコード**（nilerr lint にも引っかかる）。
  移行前スモークで validator メッセージが返ることを確認済み。
- タレント検索のカスタム比重（`wv_<valueId>` / `ci_<typeId>` の動的クエリ）は
  スペックに載せず、グループ5の `RequestIntoContext` 経由で生クエリから読む方式にした
  （validator は未知クエリを素通しする）。スペック化すると 12 個の optional パラメータが
  増えるうえ「不正値は黙って無視」の従来挙動が 400 に変わるため見送り。
- multipart は user/article に続き3例目。`readFilePart` の sentinel エラー
  （missing / too large）を従来メッセージ（"file is required" /
  "ファイルサイズは5MB以下にしてください"）にマップ。
- 前後スモーク company_group.sh は 54 ケース 0 diffs。書き込みは register で作った
  専用企業に閉じ、末尾でアカウント削除（teams / saved_candidates は FK cascade、
  メンバーの tm_ ユーザーは remove ケースで回収）。diff_bodies.py に
  companyId 揮発化・`_gallery_<8hex>` 正規化・**タレント検索 top ラベルの
  同点タイ順序ゆれ**（同一サーバーでも呼び出しごとに入れ替わる既存の非決定性）の
  ソート比較を追加。

**実施メモ（2026-07-16、グループ7完了 22addd3）:**

- 21ルート・4コントローラ（company scout / candidate scout / settings / template）。
  ServeMux 衝突なし（credits / quality / dashboard は {scoutId} の strict subset、
  bulk-decline / bulk-respond は {scoutId}/respond とセグメント数が違うため曖昧にならない）。
- **スペック補正（実装が正・additive）が本グループ最多の12 operation:**
  - `sendScout` に 409（ErrDuplicateScout）→ 既存 alias `AuthedForbiddenConflictErrors` へ変更
  - `createScoutTemplate` に 409（ErrTooManyTemplates、上限50件）→ `ConflictError | AuthedErrors`
  - ErrNotOwner（他社スカウト・他社テンプレ・他人宛スカウト）を返す 9 operation に 403 →
    `AuthedForbiddenErrors` へ変更。bulk-decline / bulk-respond は GetByID 由来の 404 も追加
- scout 系 presenter（10関数）の戻り値を `any` から生成モデルの具体型へ変更
  （strict の typed response に `*presenter.Xxx(…)` で直接埋め込むため）。
- **意図的微差:** echo 時代の `ctx.JSON(201, nil)`（company/candidate reply）は
  ボディ `"null"` を書いていたが、strict のボディ無し 201 は空になる。
  スペックはボディ無し 201 宣言なので strict が正。diff_bodies.py で
  「JSON null ＝ ボディ無し」として同義比較する正規化を追加。
- bulk-respond の不正 response 値ガード（固定メッセージ 400）は controller 責務のまま
  （nilerr には理由付き nolint）。単発 respond は従来から未検証で interactor 側の
  ステータス遷移チェックに任せている（挙動維持）。
- 前後スモーク scout_group.sh は 62 ケース 0 diffs。候補者3人で
  返信フロー（taro）・興味あり応答（hanako）・一括辞退＋再送→上限400（jiro）を分担。
  受け入れ設定 OFF 中の送信 403 は「設定チェックが重複チェックより先」を利用して
  active スカウトが残る taro 宛で踏んだ。候補者宛 notifications は company cascade で
  消えないため reference_id で手動削除、taro の user_scout_settings は事前状態
  （行なし/値）を記録して復旧。diff_bodies.py の VOLATILE に sentAt / expiresAt /
  openedAt / repliedAt / conversationId / lastReplenishedAt / templateId / senderId を追加。

**実施メモ（2026-07-16、グループ8完了 d3fed30）:**

- 18ルート・2コントローラ（job_posting / job_application）。ServeMux 衝突なし
  （アップロード3本は静的パスで POST のワイルドカード兄弟が無い。
  /api/applications/check も GET /{applicationId} が存在しないため曖昧にならない）。
- **スペック補正（実装が正・additive）は3 operation のみ**: `port.ErrForbidden` を返す
  get/update/deleteJobPosting に 403（他社求人アクセス）。応募側の owner 不一致は
  domainerr.ErrNotFound（404）方式で補正不要 — グループ6と同じく
  「他社リソースの表現が機能ごとに 403/404 で分かれている」現物を維持。
- echo 専用の共有ハンドラ `HandleImageUpload`（クロージャ返し）は strict では
  operation ごとに型が違うため、controller メソッド3本＋共通 `saveJobImage` に変形。
  拡張子ホワイトリスト（.jpg/.jpeg/.png/.webp）・5MB・従来メッセージ維持。
- unparam の指摘で `readFilePart` の field（常に "file"）と maxBytes（常に 5MB）を
  ヘルパーへ畳み込み（`maxUploadBytes` 定数）。既移行の user/article/company_profile も追随。
- ApplyJobRequest の `message` はスペック必須（省略で validator 400）。
  スモーク初回で発覚 — 空文字で送れば通る。応募系は通知を作らないため後始末が軽い。
- JobPostingRequest は全フィールド必須（空文字/null 可）のため、スモークでは
  `job_body.py` で完全な JSON を組み立てる方式にした。
- 前後スモーク jobs_group.sh は 54 ケース 0 diffs。diff_bodies.py に
  jobPostingId 揮発化と求人画像ランダムファイル名（<subdir>/<8hex>）の正規化を追加。
  アップロード実ファイルはレスポンス URL から実パスを求めて削除。

**実施メモ（2026-07-16、グループ9完了 b43e511）:**

- 22ルート・2コントローラ（messaging / notification）。ServeMux 衝突なし
  （unread-count は conversations と別リテラル、notifications の read-all（1セグメント）と
  {id}/read（2セグメント）はセグメント数が異なり曖昧にならない）。
- **スペック補正（実装が正・additive）は1 operation のみ**: `startCompanyConversation` に
  409（ErrConversationExists、同一候補者との会話が既存）→ `AuthedConflictErrors` へ変更。
  候補者間の会話開始は既存会話をそのまま 201 で返す実装のため 409 不要（非対称は仕様）。
- **`messaging.ErrNotParticipant` は既存分類どおり 400**（`isBadRequest` 掲載）。スペックには
  403 も宣言済みだが未使用のまま温存（グループ2の ErrNotAuthor と同じ「実装が正」判断）。
  この結果、**存在しない会話 ID へのアクセスも 404 ではなく 400** になる
  （参加者レコードの不在＝ ErrNotParticipant に丸められるため。挙動維持）。
- ページネーションの責務が2系統あることを確認して分離維持:
  メッセージ系は controller 責務（`messagingPagination`、デフォルト50・1-100 外は50に丸め）、
  通知系は interactor 責務（デフォルト20・上限なし）。echo 時代の挙動をそのまま踏襲。
- 通知の既読化（{id}/read）は既読済みでも 204（is_read でフィルタしない UPDATE）、
  他人の通知は owner スコープ SQL により 404（Phase 1 の IDOR 修正 047988f のまま）。
- presenter 8関数（messaging 6 + notification 2）の戻り値を `any` から生成モデルの
  具体型へ変更（scout グループと同じパターン）。
- 前後スモーク messaging_group.sh は 53 ケース 0 diffs。候補者間会話は事前存在チェック付きで
  作成・削除し、read-all で既読化される taro の既存未読通知 id を事前記録して復旧。
  通知は SQL で投入し reference_id（99999999-... の目印 UUID）で回収。企業側の会話・通知は
  スモーク企業アカウント削除の FK cascade に任せる。diff_bodies.py の VOLATILE に
  lastMessageAt / participant1Id / participant2Id を追加。

**実施メモ（2026-07-16、グループ10完了 b75e535）:**

- 8ルート・1コントローラ。ServeMux 衝突なし（propose / pending/{id} / {id}/cancel は
  いずれもセグメント数が異なる）。**SetWS 連携は維持**: wireInterview が strict 登録後も
  コントローラを返し、BuildServer が WS hub を後付けする従来構造のまま。
  WS 通知（propose 時の proposal_cancelled 送信）は strict ハンドラ内でそのまま動く。
- **スペック補正（実装が正・additive）3 operation**: `selectInterviewSlot` に 403
  （ErrNotProposalOwner、他人の提案）→ `AuthedForbiddenConflictErrors`、
  `cancelCompanyInterview` / `cancelCandidateInterview` に 403（port.ErrForbidden、
  他社/他人の面接）→ `AuthedForbiddenErrors`。
- echo で1本だった `CancelInterview`（c.Get で両キーを読む）は operation が2つ
  （company/candidate）に分かれているため strict メソッド2本＋共通 `cancelInterview` に分割。
  `ErrCancelUnauthorized`（両 principal 空）は認可が上流化された今は実質到達不能だが、
  従来どおり 401 分類を維持。
- Propose の slots 件数・RFC3339 パース・逆転チェック、ListByCompany の from/to
  デフォルト丸め（今日〜+7日）、GetPendingProposal の「全エラー→200 hasPending:false」は
  controller 責務のまま（nilerr には理由付き nolint）。
- **echo 版 `handleError` を削除**（全グループの echo controller が消えて未使用化。
  admin 系は badRequest/unauthorized 等の個別ヘルパーを使っており影響なし）。
- スモークの学び: **interview 系3テーブル（proposals/slots/interviews）は FK cascade が
  一切無い**。企業アカウント削除の前に依存順（interviews → slots → proposals）で手動削除
  しないと FK 違反で復旧が失敗する（初回実行で発覚 → スクリプト修正＋手動復旧済み）。
  スロット日時は固定（2026-08-01）にし、明示 from/to の企業一覧を決定的に。
  デフォルト窓（今日+7日）はスロットを含まず常に空で、これも決定的。
  diff_bodies.py の VOLATILE に proposalId / slotId / applicationId を追加。
- 前後スモーク interview_group.sh は 30 ケース 0 diffs。

**実施メモ（2026-07-16、グループ11完了 b64e830 — Phase 3-1 これで全グループ完了）:**

- admin 21ルート＋共有コントローラの user-facing レポート7ルート・6コントローラ。
  手順書が想定していた「PDF ダウンロード＝バイナリレスポンス」は本リポジトリに存在しない
  （CLAUDE.md の resume/job-pdf ワークフローは未実装の別系統）ため空振り。
- **スペック補正ゼロ**（Phase 2 で29 operation を実装準拠で契約化済みだったため）。
  代わりに ad-hoc map/struct → 生成モデルへの置換で**日時直列化の意図的微差**が出る:
  echo 時代は `Format("2006-01-02T15:04:05Z")`（**ローカル時刻に Z を付ける誤り**を含む）や
  秒精度 RFC3339 手書きだったが、生成モデルの time.Time は正しいオフセット付き
  RFC3339Nano で出る。管理画面は new Date() パースなので無影響（むしろ users 一覧の
  9時間ズレ表示が直る）。diff では snake_case 日時キーを揮発扱い。
- bypass-login 2本はグループ5の cookie ビルダー（authCookies / companyAuthCookies）を
  そのまま Visitor ラッパーで再利用（想定どおり）。isSecureRequest で Scheme 判定も移植。
- 共有ハンドラの二重 operation（WV/CI レポート GET の admin 版と user-facing 版、
  統合レポート GET の admin 版と公開版）は shared core ＋ typed ラッパー2本ずつに分割。
- uuid.Parse ガード（"invalid session_id" 等の 400）は validator の Uuid pattern が
  先に効くため全削除（グループ6と同じ）。UpdateStatus の approved/rejected チェックも
  スペック enum が担保するため削除（echo 時代から validator が先に 400 を返しており挙動同一）。
- **全グループ完了の仕上げ**: StrictServer の `openapi.StrictServerInterface` embed を撤去し
  `var _ openapi.StrictServerInterface = (*StrictServer)(nil)` を復活（3-0 メモの宿題）。
  PATCH /api/users/{username}（手書きハンドラ例外）のみ到達しないスタブで適合。
  これで「契約に無いハンドラ欠落」はコンパイルエラーになる。
- echo 版エラーヘルパーの後始末: handleError（グループ10）に続き notFoundError を削除。
  badRequest / unauthorized / internalError は echo 残置の ws / stripe webhook が
  使うため 3-4 まで残る。
- 前後スモーク admin_group.sh は 64 ケース 0 diffs。学び:
  - CI レポートの上書きテストは snapshot-restore（delete→insert 復元）にしたが、
    復元で heap 順が変わり **created_at 同値タイの一覧順序が入れ替わる**
    （ListAIReports 系の ORDER BY がタイを決定しない既存の非決定性）。
    diff_bodies.py で reports 配列をソート比較に変更して解消。
  - read-all 系と同様、admin の書き込みは seed の固定 ID（WV pending セッション
    30004000-…-01）を使い、レポート行は末尾で削除して復旧。

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
