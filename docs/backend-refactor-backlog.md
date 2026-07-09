# バックエンド残リファクタ バックログ

コントローラ経路統一リファクタ（`docs/controller-clean-route-refactor.md`、8/8完了）の後に残った
バックエンド側のリファクタ候補を全件まとめたもの。**どのセッションから再開しても作業が完結するように書いてある。**
2026-07-05 時点のコードベース調査に基づく（行数・行番号は当時のもの。着手時にズレていたら読み替える）。

## 方針（前提）

- 挙動変更はしない。リファクタ中に既存バグを見つけても直さず、別途報告する。
- 1項目 = 1コミット。完了したらこの手順書のチェックを入れ、同じコミットに含める。
- 各項目の検証は共通: `cd backend && go build ./... && go vet ./... && make test`

## 対象一覧と進捗（易しい順）

| # | 状態 | 項目 | 規模感 | 種別 |
|---|------|------|--------|------|
| 1 | [x] | depguard 導入（`.golangci.yml` 新規作成） | 小 | 再発防止 |
| 2 | [x] | CLAUDE.md に経路ルールを明文化 | 小 | ドキュメント |
| 3 | [x] | post_repository の PostWithUser 詰め替えを goverter 化 | 小 | 重複排除 |
| 4 | [x] | company_team_controller のレスポンス変換を presenter へ移動 | 中 | 統一 |
| 5 | [x] | usecase 層の入力正規化（TrimSpace）ヘルパー化 | 小 | 重複排除 |
| 6 | [x] | scout_interactor（667行）の分割＋ユニットテスト追加 | 大 | 分割 |
| 7 | [x] | initializer.go（775行）の機能別分割 | 中 | 整理 |
| 8 | [ ] | ルート登録の二重管理解消（生成 ServerInterface vs wire_*.go 手動登録） | 中〜大 | 再発防止 |
| 9 | [x] | displayName cookie の廃止 | 小 | 整理 |

#1 と #2 は controller-clean-route-refactor.md の「全件完了後の仕上げ」をこちらに引き継いだもの。
#8 と #9 はフロントリファクタ Phase E（2026-07-09、docs/frontend-refactor-plan.md）の作業中に
発見して切り出したもの。

---

## #1 depguard 導入

**現状:** `.golangci.yml` が存在しない。Makefile に lint ターゲットもない。
現時点で非 admin コードの層違反はゼロ（2026-07-05 調査済み）なので、入れるなら今が最適。

**やること:**

1. リポジトリルート（または backend/）に `.golangci.yml` を新規作成。
   「`internal/adapter/http/controller` から `github.com/jackc/pgx` 系の import を禁止、
   `admin_*.go` は例外」を depguard で表現する。たたき台:

   ```yaml
   linters:
     enable:
       - depguard
   linters-settings:
     depguard:
       rules:
         controller-no-pgx:
           files:
             - "**/internal/adapter/http/controller/*.go"
             - "!**/internal/adapter/http/controller/admin_*.go"
           deny:
             - pkg: "github.com/jackc/pgx"
               desc: "controller は InputPort 経由。pool 直結は admin_* のみ許可"
   ```

   ※ depguard の `files` ネガパターンの書式は golangci-lint のバージョンで変わることがある。
   導入した golangci-lint のドキュメントで要確認。ファイル単位の例外が面倒なら、
   admin コントローラを `controller/admin/` サブパッケージへ切り出してパッケージ単位で
   例外にする方がルールが単純（元手順書でも言及済みの代替案）。

2. Makefile に `lint` ターゲットを追加（`golangci-lint run ./...`）。golangci-lint 未導入なら
   インストール方法も Makefile コメントか README に残す。

3. 動作確認: わざと非 admin コントローラに `pgxpool` を import してみて lint が落ちることを確認し、戻す。

**コミット:** `chore(backend): add depguard to enforce controller layer boundary`

## #2 CLAUDE.md に経路ルールを明文化

**現状:** CLAUDE.md の開発ルールには「移行中」の記述のまま。移行は完了済み。

**やること:** CLAUDE.md の「バックエンドの経路統一リファクタ（進行中）」節を完了形に書き換える:

- 「admin コントローラ（`admin_*_controller.go`）のみ pool 直結可。それ以外の controller は
  InputPort 経由必須」
- 「複合読み取り・動的SQLは QueryService port を新設して gateway に置く。
  経路は常に controller → InputPort → interactor → (Repository | QueryService) → gateway」
- 残タスクの参照先をこのファイル（`docs/backend-refactor-backlog.md`）に更新

**コミット:** `docs: finalize backend clean-route rules in CLAUDE.md`

## #3 post_repository の PostWithUser 詰め替えを goverter 化

**現状:** `internal/adapter/gateway/db/sqlc/post_repository.go`（471行）で、sqlc 生成 row →
`post.PostWithUser` の詰め替え（約18行）が4箇所にコピーされている:

- L78 `GetWithUserByID`（`GetPostWithUserByIDRow`）
- L116 `ListTimeline`（`ListTimelinePostsRow`）
- L161 `ListByUserID`（`ListPostsByUserIDRow`）※このrowだけ Quote系フィールドを持たない
- L202 `ListLikedByUserID`（`ListLikedPostsByUserIDRow`）

**ソースがクエリごとに別の生成型なので、単一ヘルパー関数では吸収できない。**
同名フラット15フィールド前後・計算なしなので CLAUDE.md の線引き的に goverter 向き。

**やること:**

1. 同パッケージに `post_row_converter.go` を作り、`// goverter:converter` interface に
   row 型ごとのメソッドを4つ定義する（同パッケージ生成なので生成型にそのままアクセス可）。
2. `pgtype.UUID → string`（既存 `uuidToString`）、`pgtype.Timestamptz → time.Time` などは
   `// goverter:extend` で再利用。
3. `QuotedPost` は `toQuotedPost(...)` の呼び出しが必要なので `goverter:ignore` して呼び出し側で
   後付けする（派生フィールドの後付けパターン。CLAUDE.md 参照）。
   `ListPostsByUserIDRow` は Quote系ソースが無いので同様に ignore。
4. `make goverter` で再生成し、4箇所の手書き詰め替えを converter 呼び出しに置換。

goverter 化してみて `map`/`ignore` だらけで手書きより読みにくくなったら、無理せず
「row 型ごとに小さな `toPostWithUser` ヘルパー4本を手書きで並べる」だけでも、
ループ内インライン展開よりは改善なのでそれで良い。

**コミット:** `refactor(backend): dedupe PostWithUser row mapping in post_repository`

## #4 company_team_controller のレスポンス変換を presenter へ移動

**2026-07-07 完了確認:** この項目は契約クリーンアップ（f37cbdb の {items,total} 統一・
72dce1b の enum 化）の過程で解消済みだった。変換は `presenter/company_team_presenter.go`
（openapi 生成型ベース）に移動済みで、コントローラは194行・レスポンス構造体なし。
以下は起票時（2026-07-05）の記述。

**現状:** `internal/adapter/http/controller/company_team_controller.go`（364行）だけ、
レスポンス構造体とマッピングヘルパーがコントローラ内に残っている:

- L23-83: `teamResponse` / `memberResponse` / `teamDetailResponse` と
  `toMemberResponse` / `toTeamDetailResponse`
- L244 `toScores`、L329 `toPublicScoreEntries`

他のコントローラは `adapter/http/presenter` に変換を寄せているので不統一。
フィールド数は6〜11個程度で goverter の線引き（15個以上）未満 → **手書きのまま移動だけする。**

**やること:**

1. `adapter/http/presenter/company_team_presenter.go` を作り、レスポンス構造体と変換関数を移す。
   命名・形式は既存の presenter（例: `article_presenter.go`）に合わせる。
2. コントローラのハンドラは「パラメータ解釈 → input 呼び出し → presenter 呼び出し」だけにする。
3. **レスポンス JSON の完全一致を確認する**（フィールド順・omitempty・null の扱いに注意）。
   移行前に代表エンドポイントのレスポンスを保存 → 移行後に diff。
   このコントローラは public/company 両方から使われる（initializer.go の2箇所で生成）ので、
   `GetPublicTeamScores` 系も忘れず確認する。

**コミット:** `refactor(backend): move company_team response mapping to presenter`

## #5 usecase 層の入力正規化（TrimSpace）ヘルパー化

**現状:** usecase 層に `strings.TrimSpace` が41箇所。入力 struct の文字列フィールドを
1本ずつ Trim するパターンが scout / job_posting / article / company_auth / messaging /
job_application などの interactor に散在。

**やること:**

1. `internal/usecase/input_normalizer.go`（仮）に共通ヘルパーを作る:

   ```go
   func normalizeStrings(fields ...*string) {
       for _, f := range fields {
           if f != nil {
               *f = strings.TrimSpace(*f)
           }
       }
   }
   ```

2. 各 interactor の連続 Trim を置換。**Trim 以外の加工（小文字化・デフォルト値など）が
   混ざっている箇所は無理に寄せない。**

節約は30行程度で優先度は低い。#6 で scout_interactor を触るなら、そのついでにやると二度手間がない。

**コミット:** `refactor(backend): extract input string normalization helper in usecase`

## #6 scout_interactor（667行）の分割＋ユニットテスト追加

**2026-07-07 検証済み:** 以下の行数・行番号は現状のコードと一致している（再調査不要）。
テストのスタイル参考は `internal/usecase/mocks_test.go` と `interview_interactor_test.go`
（スタブstruct＋テーブルテスト。モックライブラリ不使用）。

**現状:** `internal/usecase/scout_interactor.go` に責務が同居している:

- 送信＋品質評価: `Send` (L59, 125行), `evaluateQuality` (L236), `applyQualityTransitions` (L275),
  `GetQualityScore` (L221)
- クレジット: `GetCredits` (L213)
- 候補者側の応答・会話化: `Respond` (L364), `processResponse` (L382),
  `createConversationFromScout` (L428, 64行), `CandidateReply` (L492), `BulkDecline` / `BulkRespond` (L554-)
- 企業側の閲覧・返信: `ListByCompany`, `GetDetail`, `CompanyReply`
- 設定・ダッシュボード: `UpdateScoutSettings`, `GetScoutSettings`, `GetDashboard` (L602)

**さらに `scout_interactor_test.go` が存在しない**（他の主要 interactor にはテストあり）。
品質スコアリング・状態遷移・クレジット消費はロジックの塊なのでテスト必須級。

**やること（推奨順）:**

1. **先にテストを書く。** 現状の公開メソッドに対して `usecase/mocks_test.go` のスタイルで
   `scout_interactor_test.go` を追加。特に `Send`（クレジット消費・品質判定）、
   `Respond`/`processResponse`（状態遷移・会話作成）、`evaluateQuality` 周り。
   分割はテストという安全網ができてから。
2. 分割は「別 struct に切り出す」より、まず**同パッケージ内のファイル分割**で十分:
   `scout_interactor.go`（送信・閲覧）/ `scout_quality.go`（品質評価・遷移）/
   `scout_response.go`（候補者応答・会話化）/ `scout_settings.go`（設定・ダッシュボード）。
   InputPort の形は変えない（controller に影響を出さない）。
3. L665 `isNotFound` は scout 固有ではないので `usecase/errors.go`（新設）へ移し、
   messaging など他 interactor からの利用も明示的にする。

テスト追加（手順1）だけ先に独立コミットにしてよい。

**コミット:**
- `test(backend): add unit tests for scout_interactor`
- `refactor(backend): split scout_interactor by responsibility`

## #7 initializer.go（775行）の機能別分割

**現状（2026-07-07 更新）:** `internal/driver/initializer/api/initializer.go` は 775 行
（2026-07-07 に OpenAPI リクエスト検証ミドルウェアの配線が追加されて増加）。
生成呼び出しが約80箇所。DI 配線が一枚岩で、機能追加のたびにこのファイルが伸びる。

**分割時の注意（2026-07-07 追加分）:**

- `BuildServer` 冒頭のミドルウェア配線順序を崩さないこと:
  `Recover → Logger → OpenAPIRequestValidator（openapigen.SpecYAML を埋め込みから読む）→ CORS → 各ルート`。
  バリデータ構築が error を返すパスでは `cleanup()`（pool.Close）を呼んでから return している。
- 認証ミドルウェアは5種（jwtMW / optionalJwtMW / companyJwtMW / anyJwtMW(L334付近) /
  AdminAuth(L485付近の adminGroup)）をルート単位で使い分けている。機能別 wire ファイルに
  ルート登録を移す際は、どのミドルウェアを受け取るかをシグネチャで明示する。

**やること:**

1. 同パッケージ内でファイル分割する（パッケージは変えない）:
   `initializer.go`（サーバ起動・ルーティングの骨格）+ 機能別の配線ファイル
   （例: `wire_user.go`, `wire_jobs.go`, `wire_scout.go`, `wire_interview.go`, `wire_admin.go`）。
2. 各ファイルは「pool 等の共有依存を受け取り、配線済みコントローラを返す関数」を持つ形にする。
   凝った DI フレームワークは入れない（Presenter廃止・factory廃止で儀式を減らした経緯があるため、
   逆行しない）。
3. 純粋な移動リファクタなので、ビルドが通ってルーティングが変わらなければOK。
   ルート一覧を移行前後で diff できると安心（`grep -o 'e\.\(GET\|POST\|PUT\|DELETE\|PATCH\)[^)]*' ` 等で機械的に）。

**コミット:** `refactor(backend): split initializer wiring by feature`

---

# CI/CD 導入バックログ

現状（2026-07-05 再調査）: **CI は無い**（`.github/workflows` なし）が、**デプロイは既に Cloud Run で稼働中**。
マルチステージ Dockerfile（ルート、front+API同居の1イメージ）＋ `cloudbuild.yaml` ＋ Secret Manager 済み。
DB は Neon、画像は R2（`docs/deploy-plan.md` 参照）。ただしデプロイは**ローカルから
`gcloud builds submit` の手動実行**で、マイグレーションもローカルから Neon へ手動適用。
つまり「CD の土台はあるが、ゲート（CI）・自動化・ロールバック設計が無い」状態。
ここを埋めるのが C1〜C10。**面接で「なぜこうしたか」を語れる形**で段階的に積む。

各項目に「面接で語れるポイント」を付けてある。実装そのものより、
**トレードオフを自分の言葉で説明できること**が評価される（丸写しで終わらせない）。

## 対象一覧と進捗（着手順 = 依存順）

| # | 状態 | 項目 | 面接インパクト |
|---|------|------|--------------|
| C1 | [x] | 基礎CI（backend + frontend、キャッシュ・並列・path filter） | ★★☆ 土台。無いと話にならない |
| C2 | [x] | 生成コードのドリフト検査 | ★★★ 地味だが強い。sqlc/oapi/goverter構成ならでは |
| C3 | [x] | マイグレーション検証CI（クリーンDB適用＋append-onlyチェック） | ★★★ DB運用の事故を語れる |
| C4 | [x] | テストカバレッジ計測＋PRコメント（octocov） | ★★☆ 可視化の習慣を示せる |
| C5 | [x] | セキュリティスキャン（govulncheck / gitleaks / Dependabot） | ★★★ シフトレフトを語れる |
| C6 | [x] | コンテナイメージの堅牢化（Trivy・タグ運用・2プロセス問題） | ★★☆ コンテナ知識の証明 |
| C7 | [x] | compose ベースの E2E スモークテスト | ★★★ 「単体で緑でも結合で死ぬ」への回答 |
| C8 | [x] | リリース自動化（tagpr） | ★☆☆ 余裕があれば |
| C9 | [x] | シークレット漏洩対策の多層防御 | ★★★ インシデント対応まで語れる |
| C10 | [x] | 本番CDの自動化（OIDC）＋ロールバック設計 | ★★★ **決定打。「かなり評価」ラインの本体** |

C9 は C5（CI での gitleaks 検知）の前段〜後段を埋めるもので、C5 とセットで「多層防御」として完成する。
着手自体は CI が無くても可能（pre-commit hook と GitHub 設定だけ）なので、C1 より先にやってもよい。

## C1 基礎CIパイプライン

**やること:** `.github/workflows/ci.yml` を作る。

- **backend ジョブ:** `go build ./...` → `go vet` → `golangci-lint run`（リファクタ#1のdepguardがここで効く）
  → `make test`。テストは `services:` で **PostgreSQL コンテナを立てて実行**（モックだけで済ませない）。
  DB起動待ちは `options: --health-cmd pg_isready` で。
- **frontend ジョブ:** `biome check` → `tsc --noEmit` → `next build`。
  ※ package.json に typecheck スクリプトが無いので追加する。
- **共通の作法**（ここが差が付くポイント）:
  - `paths` フィルタで backend/frontend 変更時のみ該当ジョブを実行
  - Go modules / Next.js のキャッシュ（`actions/setup-go` の内蔵キャッシュ、`actions/cache` で `.next/cache`）
  - `concurrency: cancel-in-progress` で同一PRの古い実行をキャンセル
  - `permissions: contents: read` を明示（デフォルト権限で回さない）
  - サードパーティ action は **コミットSHAでピン留め**（タグは動くので）

**2026-07-07 実装済み:** `.github/workflows/backend-ci.yml` / `frontend-ci.yml`。
上記の作法（paths / キャッシュ / concurrency / permissions 最小化 / SHAピン留め）は全部入り。
frontend の biome は導入時に201ファイルを一括正規化した上で **linter 有効・error ゼロ**で運用
（条件付きフック呼び出しの実バグ1件もこの過程で修正）。大量系ルールは biome.jsonc に理由付きで
調整済み: **a11y グループ(約700件)・noImgElement(56)・noNonNullAssertion(51)・noArrayIndexKey(79)
は off（それぞれ別タスク）**、noExplicitAny(15)・useExhaustiveDependencies(38) は warn で可視化。
off にした a11y / next-image 対応は着手時にルールを戻すところから始める。

**面接で語れるポイント:** 「CIの実行時間を何分に抑えたか・そのために何をしたか」
（キャッシュヒット率、ジョブ並列化、path filter）。権限最小化とSHAピン留めは
サプライチェーン攻撃（例: 2025年の tj-actions/changed-files 事件）を踏まえて、と言えると強い。

## C2 生成コードのドリフト検査

**やること:** CI に「生成物が手元とズレていないか」のジョブを足す。

```yaml
- run: make sqlc && make oapi && make goverter
- run: git diff --exit-code || (echo "生成コードがコミットされていません" && exit 1)
```

goverter バイナリの Go バージョン制約（CLAUDE.md 参照）があるので、CI でも
`GOTOOLCHAIN` を固定してインストールする。

**面接で語れるポイント:** 「生成コードをコミットする派 vs CI生成派」のトレードオフを説明できる。
本プロジェクトはコミット派（ビルドの再現性・レビューで差分が見える）なので、
ドリフト検査で「手で直した・再生成し忘れた」を機械的に弾く、という一貫した設計判断として語れる。

## C3 マイグレーション検証CI

**やること:**

1. クリーンな PostgreSQL コンテナに `migrate up` を全件適用し、失敗したら落とすジョブ。
2. **append-only チェック:** `git diff --name-status origin/main... -- backend/migrations/` で
   既存マイグレーションファイルの変更(M)・削除(D)を検出したら落とす（追加(A)のみ許可）。
3. 余裕があれば新規マイグレーションだけ `up → down → up` して down の可逆性も検証。

**2026-07-07 実装済み:** `.github/workflows/migrations-ci.yml`。append-only（PR時、M/D/R検出で失敗）＋
クリーンDB全適用＋新規分の up→down→up 可逆性検証（PR時）まで実装。migrate はローカルと同じ
v4.19.1 を go install（sumdb検証付き）で導入。ローカルでクリーンDB全43本適用と可逆性を事前検証済み。

**面接で語れるポイント:** 「適用済みマイグレーションを書き換えると環境間でスキーマが分岐する」
という実運用の事故パターンを CI で予防している、と説明できる。CLAUDE.md の
`down -all 禁止` ルールを人間の注意ではなく機械で担保する話として繋げられる。

## C4 カバレッジ計測＋PRコメント

**やること:** `go test -coverprofile` を取り、[octocov](https://github.com/k1LoW/octocov) で
PRにカバレッジをコメント。`.octocov.yml` で「前回より下がったら警告」を設定。

**2026-07-07 実装済み:** ルート `.octocov.yml` ＋ backend CI に octocov-action v1.5.1（SHAピン留め）を追加。
`make test-cover` で CI・ローカル同形式（現状ベースライン **9.6%**、テスト無しパッケージも分母に含む）。
ゲートは `acceptable: diff >= -1%`（main の前回レポート比。削除リファクタの誤差 1pt まで許容、
初回は prev 無しで必ず通る）。前回レポートの保存先は Actions Artifacts（追加インフラ不要）。
codeToTestRatio は生成コード（`*.gen.go` / `sqlc/generated/`）を分母から除外。
octocov に必要な権限（`pull-requests: write` / `actions: write`）は job レベルに限定し、
workflow レベルは `contents: read` のまま。ローカルで `octocov dump` により設定のパースと計測を検証済み。

**面接で語れるポイント:** 「カバレッジ○%を目標にする」ではなく
「**下げない**ことをゲートにする」方針を選んだ理由（数値目標はテストの質を歪める）。
リファクタ#6（scout_interactor テスト追加）の前後でカバレッジが動くので、実データで語れる。

## C5 セキュリティスキャン

**やること:**

- `govulncheck ./...` を CI に追加（Go 標準の脆弱性DB照合。**実際に呼んでいる関数単位**で判定する点が偉い）
- [gitleaks](https://github.com/gitleaks/gitleaks) でシークレットのコミット検出
- `dependabot.yml` で gomod / npm / github-actions の3エコシステムを週次更新
- （C6の後で）Trivy によるイメージスキャン

**2026-07-07 実装済み:** `.github/workflows/security.yml`（govulncheck v1.5.0 / gitleaks v8.30.1、
push・PR・週次schedule）＋ `.github/dependabot.yml`（gomod/npm×2/actions、週次、npmメジャーは手動）。
導入時に govulncheck が**到達可能な脆弱性26件を実際に検出** → toolchain 1.25.11・pgx 5.9.2・
x/net 0.55.0 へ更新して0件にした（f028edf）。gitleaks は全履歴312コミットで漏洩ゼロを確認済み。

**面接で語れるポイント:** govulncheck が「依存に脆弱性がある」ではなく
「脆弱な関数に到達可能か」で判定する仕組みを説明できると、ツールを入れただけの人と差が付く。
Dependabot PR を CI（C1〜C3）が守ってくれるから安心してマージできる、という関係性も語れる。

## C6 コンテナイメージの堅牢化

**現状:** ルート `Dockerfile` は既に良い形（frontend standalone / Go `CGO_ENABLED=0` /
3ステージ構成）。フロントと API を1イメージに同居させ、
`CMD ["sh", "-c", "./api & ... node server.js"]` で2プロセス起動し Cloud Run 1サービスで運用。
無料枠に収める合理的判断だが、弱点が1つある:
**`./api &` でバックグラウンド化した API が死んでも、node が生きている限り
Cloud Run はコンテナを健全と判定し続ける**（リクエストは 502 になるのに再起動されない）。

**やること:**

1. **2プロセス問題の対処:** 起動スクリプトを「どちらかが死んだらコンテナごと落ちる」形にする
   （`wait -n` で先に終了した方を検知して exit）。Cloud Run が再起動してくれるようになる。
   サービス分割（front/API 別 Cloud Run）はコスト増なので、**あえて同居を維持する判断**でよい。
2. Trivy でイメージスキャン（CI に組み込み、HIGH 以上で fail）。
3. タグ運用: `latest` 依存をやめ git SHA タグに統一（C10 のトレーサビリティと連動）。
4. `.dockerignore` の確認（`backend/uploads/`・`node_modules`・`.git` がコンテキストに入っていないか）。

**2026-07-07 実装済み:**

1. **2プロセス問題:** `docker/start.sh` を新設し CMD を差し替え。両プロセスを background 起動し、
   `kill -0` の5秒間隔ポーリングでどちらか一方の終了を検知 → 残りも kill して先に死んだ方の
   終了コードでコンテナごと exit。SIGTERM は trap で両プロセスへ転送（グレースフルシャットダウン維持）。
   **`wait -n` は採用しなかった:** busybox ash（node:22-alpine）の `wait -n` は「wait 実行前に
   終了済みのジョブ」を拾わず、片方が起動直後に即死すると永遠に待ち続けるレースを実機で踏んだため
   （最初 wait -n で実装 → 検証で発覚 → ポーリングに変更）。
   実機検証: 片方即死→**コンテナごと Exited(1)**（旧CMDではnodeが生き残る）、
   DBあり正常稼働(front 200)→API kill→Exited(137)、の両パスを確認。
2. **Trivy 導入時に HIGH 18件を実際に検出 → 全部潰して0件にした:**
   Go バイナリの x/crypto 0.51.0（9件、govulncheck では到達不能判定だったが Trivy はバージョン判定）
   → 0.52.0 へ更新。next 16.2.4（7件）→ 16.2.6 へ更新。残り2件（picomatch/sigstore）は
   **ベースイメージ同梱の npm CLI 由来**で、ランタイムでは npm/npx/corepack/yarn を使わないため
   runtime ステージから削除して解消（攻撃面の縮小も兼ねる）。
3. **Trivy CI:** `.github/workflows/image-ci.yml` 新設。本番と同じ Dockerfile でビルド→イメージスキャン。
   HIGH/CRITICAL で fail、`ignore-unfixed: true`（修正版が無い脆弱性はアクション不能なため
   ゲートから除外し、修正可能なものだけ止める）。週次 schedule 付き（ベースイメージの新規CVE検知）。
4. **タグ運用:** cloudbuild.yaml から `latest` と `BUILD_ID` タグを廃止し `_GIT_SHA` 必須に統一。
   デプロイコマンドは `--substitutions=_GIT_SHA=$(git rev-parse --short=12 HEAD)`
   （docs/deploy-plan.md 更新済み。クリーンな作業ツリーで実行する注意書きも追記）。
5. **.dockerignore:** `backend/uploads`・`node_modules`・`.git` はカバー済みだった。
   `frontend/.next`（ローカルdevビルドの混入防止・コンテキスト削減）、`backend/coverage.out`、
   `.github` を追加。

**面接で語れるポイント:** 「1コンテナ2プロセスは行儀が悪いとされるが、無料枠・個人規模では
サービス分割のコストが見合わない。代わりにプロセス監視の穴だけ塞いだ」という
**教科書と現実のトレードオフを自分で判断した話**ができる。これは「distroless にしました」より強い。

## C7 E2E スモークテスト

**やること:**

1. `compose.yml` を整備（PostgreSQL + backend + frontend）。backend に `/healthz`
   エンドポイントが無ければ足す（DB ping まで見る readiness と、プロセス生存だけの liveness を分ける）。
2. CI で `docker compose up -d` → ヘルスチェック待ち → 主要APIを数本 curl で叩いて
   ステータス・レスポンス形を検証 → `docker compose logs` を失敗時にダンプ。
3. 本格的にやるなら Playwright で「ログイン→求人一覧表示」程度の1シナリオだけ足す
   （E2Eは増やすほど flaky になるので**意図的に薄く**保つ）。

**2026-07-07 実装済み:**

1. **`/healthz`（liveness）・`/readyz`（readiness、DB ping・2秒タイムアウト）を追加。**
   業務ロジックが無いので controller → InputPort を通さず driver 層
   （`initializer/api/health.go` の `wireHealth`）に直接配線（depguard 制約にも抵触しない）。
   C10 の Cloud Run probe でもこれを使う。
2. **compose.yml に `profiles: ["e2e"]` で `migrate`（migrate/migrate v4.19.1 one-shot）と
   `app`（本番と同じ Dockerfile = front/API 同居イメージ）を追加。** 普段の `docker compose up`
   （DB だけ）には影響しない。ポートは 18080/18081 に逃がしてローカル開発プロセスと衝突しない。
   **ローカルで e2e profile を使うと開発用 DB ボリュームを共有する**ので、スモークは read-only 前提・
   ローカルでは `down -v` しない（CI はクリーン環境なので `down -v` で掃除）。
3. **`scripts/e2e-smoke.sh`:** readyz ポーリング（最大120秒）→ healthz/readyz → front 200 →
   **front経由 /api/jobs**（プロキシ→API→DB の全チェーン）→ API直 /api/articles
   （{items,total} 契約を jq で形検証）→ 未認証 /api/applications が 401（認証MWの配線確認）。
   計6チェック・書き込みなし。意図的にこれ以上増やさない。
4. **`.github/workflows/e2e-smoke.yml`:** compose up → スモーク → 失敗時 logs ダンプ → down -v。
   `up --wait` は使わない（one-shot の migrate が正常終了すると unhealthy 扱いされる compose の
   挙動を踏むため。起動待ちはスクリプト側 readyz ポーリングに寄せた）。
5. Playwright の1シナリオは見送り（スモーク6本で「結合で死ぬ」検知には十分。増やすなら
   ログイン→求人一覧の1本だけ、という上限を決めておく）。

**面接で語れるポイント:** テストピラミッドの実践。「E2Eを薄く保つ判断」は
「E2Eをたくさん書きました」より評価される。flaky テストにどう向き合うかは頻出質問。

## C8 リリース自動化

**やること:** [tagpr](https://github.com/Songmu/tagpr) で「リリースPRをマージしたら
自動でタグ＋GitHub Release＋CHANGELOG」の流れを作る。C6と繋げて、タグ push で
バージョン付きイメージを GHCR に push するところまで。

**2026-07-07 実装済み:** `.tagpr`（vPrefix / releaseBranch=main / **versionFile=-**
（アプリなのでバージョンファイルは持たず git タグのみ）/ changelog / release）＋
`.github/workflows/tagpr.yml`（v1.20.0 SHAピン留め、job レベルで contents/pull-requests: write）。
リポジトリ設定 "Allow GitHub Actions to create and approve pull requests" は API で有効化済み
（default_workflow_permissions は read のまま維持）。**初回のリリースPRは push 後に自動作成される**
（未 push なので動作確認はそこで）。
**GHCR への image push は意図的に見送り:** 本番イメージは Artifact Registry に git SHA タグで
既に一意管理されており（C6）、GHCR への複製は置き場所が増えるだけで trace 性は向上しない。
イメージ公開の要件が出たら C10 のパイプラインに組み込む。

**面接で語れるポイント:** 「リリース作業が属人化していない・手順書ではなく仕組みになっている」
という話。優先度は低いので、C1〜C7が終わって余裕があれば。

## C9 シークレット漏洩対策の多層防御

**現状（2026-07-05 監査済み）:**

- `.gitignore` は `.env` / `.env.*` をカバー済み。現在追跡されている env ファイルは無い。
- ただし **be9000b（2026-04-17）で `.env` が一度コミットされ、630bd00（2026-04-19）で削除された履歴がある**。
  中身はローカル開発用ダミー値（`postgres://user:password@localhost:5434/...`）のみで実害なし・対応不要。
  「削除しても履歴には残る」の生きた実例としてそのまま面接ネタにできる。
- `.env.example` が無い（新規参加者がどの変数が必要か分からない）。

**やること（層ごと）:**

1. **予防（コミット前）:** gitleaks を pre-commit hook で実行する。
   hook 管理は [lefthook](https://github.com/evilmartians/lefthook) が Go 製で相性がよい
   （`lefthook.yml` をコミットすれば全員に同じ hook が入る）。
   `.env.example` を作ってコミットし、実値は今後も ignore 運用。
2. **ブロック（push 時）:** GitHub の **Secret scanning + Push protection** を有効化する
   （public リポジトリなら無料・設定ONにするだけ。known パターンのトークンは push 自体が拒否される）。
3. **検知（CI）:** C5 の gitleaks ジョブ。`fetch-depth: 0` で**全履歴**をスキャンする
   （直近コミットだけ見ても過去の混入は見つからないため）。
4. **そもそも長期キーを持たない（運用）:** CI が使う値は GitHub Actions Secrets（環境ごとは
   Environments）に置き、ログへの `echo` 禁止。GCP への認証はアクセスキー保存ではなく
   **OIDC フェデレーション**（`id-token: write`）で短命トークンを取る（実装は C10）。
5. **漏れた後の手順を README/docs に書いておく:**
   ①**最優先はローテーション（無効化）**。履歴から消すことではない。
   ② push protection のバイパス履歴・アクセスログ確認。
   ③そのうえで必要なら `git filter-repo` で履歴書き換え（公開済みなら「消しても漏れた事実は
   取り消せない」前提で動く）。

**2026-07-07 実装済み:** lefthook.yml（pre-commit gitleaks）＋ `.env.example` ＋
`docs/security-secrets.md`（層の全体像とインシデントランブック）。層2の GitHub Push protection は
**private リポジトリのため未設定**（GHAS 課金が必要。public 化時に ON）。hook は偽キーで
「コミットが実際にブロックされる」ことまで検証済み。lefthook は PATH に `~/go/bin` が無いと
fail-open する点を docs に明記（強制層は CI 側の gitleaks）。

**2026-07-07 追記（176e53f）:** 層2の無料近似として **pre-push hook** を追加。Push protection が
private では有料（Secret Protection $19/committer/月）のため、push 直前にローカルで
未 push 分を gitleaks スキャン（範囲が取れなければ全履歴・実測8秒にフォールバック）。
実地検証済み: `--no-verify` で混入させた偽 PAT が `git push --dry-run` で実際にブロックされ、
クリーン状態では 0.35 秒で通過。**gitleaks の検出限界も実測で確認**: AWS アクセスキー ID 単体は
検出対象外（secret key 側は generic-api-key で検出）、既知サンプルキーは allowlist。
このため「検出率100%の壁」ではなく、層4（そもそも長期キーを持たない・C10 OIDC）が本丸のまま。

**面接で語れるポイント:** 単発ツールではなく「予防→ブロック→検知→最小化→対応」の
多層防御として設計したと言えること。「秘密情報をコミットしたらどうしますか？」は頻出質問で、
「filter-repo で消します」だけの回答は減点（正解はまずローテーション）。
自リポジトリの履歴監査を実際にやった話（上記 be9000b）は具体性が出る。
OIDC は「長期クレデンシャルをどこにも保存しない」設計としてクラウド系の面接で特に刺さる。

## C10 本番CDの自動化＋ロールバック設計

**現状:** Cloud Run 稼働中・Secret Manager 導入済みと土台は良いが、
デプロイは**ローカルから `gcloud builds submit` を手動実行**。これには2つの問題がある:

- **未コミットのコードが本番に出うる**（ローカルの作業ツリーがそのままビルドされる）。
  「本番で動いているものがどのコミットか」を後から特定できない。
- マイグレーションもローカルから手動なので、「アプリだけ更新されて DB 未migrate」の
  順序事故が人間の注意力頼み。

**やること:**

1. **GitHub Actions からキーレスでデプロイ:** GCP 側に Workload Identity Federation を設定し、
   `google-github-actions/auth` の **OIDC 認証**で main への push から自動デプロイ。
   サービスアカウントの鍵 JSON を GitHub Secrets に置かない（C9-4 の実践）。
   SA の権限は Cloud Run deploy + Artifact Registry push + Cloud Build 実行に最小化。
2. **CI をゲートにする:** C1〜C3 のジョブが通った後段でのみ deploy ジョブが走るように
   `needs:` で依存させる。「テストが通らないものは本番に出られない」を構造で保証。
3. **トレーサビリティ:** イメージタグを git SHA に統一し、Cloud Run のリビジョンから
   コミットまで一意に辿れるようにする（`BUILD_ID` タグはビルドには紐づくがコードに紐づかない）。
4. **ロールバック設計（ここが本体）:**
   - デプロイは `--no-traffic` でリビジョンだけ作成 → ヘルスチェック確認 →
     `gcloud run services update-traffic` でトラフィック切替、の2段階にする。
     余裕があれば 10%→100% の段階切替（カナリア）まで。
   - **1クリックロールバック:** `workflow_dispatch` で「直前の健全リビジョンへ 100% 戻す」
     ワークフローを用意し、手順を README に書く。
5. **マイグレーションのパイプライン組み込み:** deploy 前ステップで Neon へ `migrate up`。
   その前提として**マイグレーションは後方互換（expand-contract）縛り**にする:
   旧リビジョンへロールバックしても新スキーマで動けること
   （カラム削除は「参照を消したリリースの次のリリースで」）。この規律を docs に明文化し、
   C3 の append-only チェックとセットで機械的に守る。
6. Cloud Run の **startup / liveness probe** を設定する（C7 の `/healthz` と連動。
   C6 の2プロセス問題を塞いでいないと probe が意味を成さないので C6 とセットで）。

**面接で語れるポイント:** 「CI/CD構築経験」の求人で企業が本当に見たいのは CD 側。
- OIDC キーレス認証（「なぜ SA キーを Secrets に置かないのか」まで説明できる）
- リビジョン分離＋トラフィック切替によるロールバック設計（「デプロイ失敗したらどうしますか」への実装済みの回答）
- **expand-contract**（DB とアプリのロールバック整合。ここまで語れる candidate は少ない）
- 「未コミットコードが本番に出うる手動デプロイを、コミット起点の CD に直した」という Before/After

**2026-07-07 実装済み:** `.github/workflows/deploy.yml`（CD 本体）＋ `rollback.yml`（1クリック
ロールバック）＋ `docs/cd-rollback.md`（runbook・expand-contract 規律）。cloudbuild.yaml は削除
（Cloud Build 経路廃止。env/secrets の正は deploy.yml へ、緊急手動手順は docs/deploy-plan.md 4-1b）。
実装上の判断:
- **GitHub 側のシークレット/変数はゼロ。** WIF（pool `github` / provider `github-oidc`、
  `assertion.repository == 'ryo112345/inselfy_4_17'` の attribute condition 付き）＋
  `github-deployer` SA。migrate 用の DB パスワードも OIDC 認証後に Secret Manager から取得。
- **`--allow-unauthenticated` を CD から外して `run.developer` で足りる設計に。**
  同フラグは `setIamPolicy` を要求し `run.admin` 昇格が必要になるが、既存の allUsers invoker
  はフラグ省略で維持されるので不要。SA 権限は run.developer＋ランタイムSAへの
  serviceAccountUser＋AR リポジトリ単位 writer＋db-password 単体の secretAccessor に最小化。
- **CI ゲートは既存 4 ワークフロー（backend/frontend/migrations/e2e）の reusable 化**（`workflow_call`）
  ＋ deploy ジョブの `needs:`。二重実行を避けるため 4 本から push トリガを削除（PR トリガは維持、
  main への push は deploy.yml が唯一の入り口）。**gotcha: called workflow 内の `github.workflow` は
  呼び出し元の名前に解決されるため、concurrency group をファイル名直書きに変更**
  （旧 `${{ github.workflow }}` のままだと 4 本が同一グループで相互キャンセルする）。
- **migrate は Neon の direct エンドポイント**（`-pooler` 無し）に対して実行。golang-migrate の
  advisory lock はセッション必須で、PgBouncer(transaction pooling) 経由では壊れうるため。
  アプリの DB_HOST は pooler のまま。
- **probe は front プロキシ経由の `/api/readyz`（startup）・`/api/healthz`（liveness）。**
  コンテナ内は Next(8080)＋API(8081) 同居で probe は 8080 にしか届かないため、health.go に
  `/api/` プレフィックス版エイリアスを追加し、この経路を e2e-smoke でも常時検証。
  startup は Neon の scale-to-zero 復帰を見込み最大 120 秒（5s×24）、liveness は誤殺回避で
  緩め（30s×3、DB を見ない）。
- 既知の割り切り: deploy と e2e で docker build が二重実行される（将来 buildx の registry cache で
  最適化）。カナリア（段階切替）は未実装（`--to-tags=candidate=10` を挟めば足せる）。

---

## #8 ルート登録の二重管理解消

**現状（2026-07-09 発見）:** oapi-codegen が `internal/adapter/http/generated/openapi/server.gen.go` に
`ServerInterface`＋`RegisterHandlers` を生成し、`controller/server.go` がそれを実装しているが、
**実際の echo ルート登録は `driver/initializer/api/wire_*.go` の手動登録**で行われており、
`RegisterHandlers` は使われていない。このため:

- スペックにルートを足して `server.go` に実装しても、wire に手動登録しないと 404 になる
  （`GET /api/scouts/unread-count` 追加時に実際に踏んだ。`wire_scout.go` への追記で解決）。
- スペック上のパスと実際に生えるパスがコンパイル時にもテストでも照合されない。

**やること:** まず方針を決める（ユーザーと相談）:

- **案a: RegisterHandlers に全面移行**して wire の手動登録を廃止。認証ミドルウェア
  （jwtMW / companyJwtMW / AdminAuth）がルートグループ単位で掛かっている構造を、
  per-route 適用か oapi-codegen の middleware オプションでどう表現するかが課題。変更が大きい。
- **案b: 手動 wire に一本化**（server.go / ServerInterface 実装は現状のまま「実装漏れ検知」用と
  割り切る）＋ドリフト検査を追加: 埋め込みの openapi.yaml のパス・メソッド一覧と
  `e.Routes()` を突き合わせるユニットテストを書き、スペックにあるのに未登録なら fail させる。
  既存構成に近く、C2 の生成コードドリフト検査とも相性がよい。

**検証:** `go build ./... && make test`、全ルートのスモーク（案b ならドリフトテスト自体が検証になる）。

**コミット:** 案b の場合 `test(backend): detect spec-vs-router drift`

## #9 displayName cookie の廃止

**2026-07-10 完了:** フロントに `cookieStore.get("displayName")` が11箇所あった（Sidebar への
SSR フォールバック用 prop）が、Sidebar は `user?.name ?? displayName` で auth 読込後は API 値を
使い、ロード中はスケルトン表示のため cookie 値は実質不使用 → 11箇所とも読み取りを除去
（Sidebar の `displayName` prop 自体は API 由来の `data.user.name` を渡す箇所があるため存続）。
backend は `setUserInfoCookies` から発行を除去、`clearAuthCookies` は既存ブラウザの掃除のため
displayName を残した。`buildCookieHeader` の再エンコードも残留 cookie 対策として維持。
検証: bypass-login の Set-Cookie に displayName が無いこと、logout で displayName が
Max-Age=0 で消されること、レガシー displayName cookie（日本語値）を付けた状態で
home / profile（isOwner 判定含む）/ articles の SSR が 200 を返すことを実機確認済み。

**現状（2026-07-09 発見）:** `controller/auth_controller.go` がログイン時に
`setCookie("displayName", user.Name)`（HttpOnly、url.QueryEscape 済み）を設定している。
HttpOnly なのでクライアント JS からは読めず、SSR 側の利用も username cookie で足りる範囲。
日本語値を含むため、フロントの cookie 転送で ByteString エラーを起こした前科がある
（frontend の fe81704 で転送側は修正済みだが、発生源はこの cookie）。

**やること:**

1. フロントで displayName cookie を参照している箇所が無いか横断調査（`cookieStore.get("displayName")` 等）。
2. 無ければ backend の setCookie / clearAuthCookies から displayName を除去
   （clear 側は既存 cookie の掃除のためしばらく残す）。
3. 検証: ログイン→プロフィール SSR（isOwner フォールバック）→ログアウトの一連。

**コミット:** `refactor(backend): stop issuing displayName cookie`

---

## 調査済みで「やらない」と判断したもの

再調査の手間を省くため、候補に挙がったが見送ったものも記録しておく:

- **層違反の修正:** 非 admin コードに pgxpool 直結は残っていない（2026-07-05 調査でゼロ）。#1 の depguard で固定するだけでよい。
- **dead code 削除:** 未使用の公開関数・型・presenter/factory の残骸は見つからなかった。
- **TODO/FIXME 対応:** usecase / controller / gateway 層に TODO/FIXME コメントは存在しない。
- **job_posting_repository.go（753行）等の大きな gateway の分割:** CRUD＋検索が同居しているが、
  リポジトリパターンとして許容範囲。QueryService 分離済みの構造を崩してまで割る理由がない。
- **手書き presenter の goverter 化:** `article_presenter.go`・`auth_presenter.go` 等は条件分岐・
  派生フィールドを含むため CLAUDE.md の線引きで手書き維持が正解。
