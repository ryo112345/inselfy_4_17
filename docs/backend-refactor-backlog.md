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
| 1 | [ ] | depguard 導入（`.golangci.yml` 新規作成） | 小 | 再発防止 |
| 2 | [ ] | CLAUDE.md に経路ルールを明文化 | 小 | ドキュメント |
| 3 | [ ] | post_repository の PostWithUser 詰め替えを goverter 化 | 小 | 重複排除 |
| 4 | [ ] | company_team_controller のレスポンス変換を presenter へ移動 | 中 | 統一 |
| 5 | [ ] | usecase 層の入力正規化（TrimSpace）ヘルパー化 | 小 | 重複排除 |
| 6 | [ ] | scout_interactor（667行）の分割＋ユニットテスト追加 | 大 | 分割 |
| 7 | [ ] | initializer.go（775行）の機能別分割 | 中 | 整理 |

#1 と #2 は controller-clean-route-refactor.md の「全件完了後の仕上げ」をこちらに引き継いだもの。

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
| C1 | [ ] | 基礎CI（backend + frontend、キャッシュ・並列・path filter） | ★★☆ 土台。無いと話にならない |
| C2 | [x] | 生成コードのドリフト検査 | ★★★ 地味だが強い。sqlc/oapi/goverter構成ならでは |
| C3 | [ ] | マイグレーション検証CI（クリーンDB適用＋append-onlyチェック） | ★★★ DB運用の事故を語れる |
| C4 | [ ] | テストカバレッジ計測＋PRコメント（octocov） | ★★☆ 可視化の習慣を示せる |
| C5 | [ ] | セキュリティスキャン（govulncheck / gitleaks / Dependabot） | ★★★ シフトレフトを語れる |
| C6 | [ ] | コンテナイメージの堅牢化（Trivy・タグ運用・2プロセス問題） | ★★☆ コンテナ知識の証明 |
| C7 | [ ] | compose ベースの E2E スモークテスト | ★★★ 「単体で緑でも結合で死ぬ」への回答 |
| C8 | [ ] | リリース自動化（tagpr） | ★☆☆ 余裕があれば |
| C9 | [ ] | シークレット漏洩対策の多層防御 | ★★★ インシデント対応まで語れる |
| C10 | [ ] | 本番CDの自動化（OIDC）＋ロールバック設計 | ★★★ **決定打。「かなり評価」ラインの本体** |

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

**面接で語れるポイント:** 「適用済みマイグレーションを書き換えると環境間でスキーマが分岐する」
という実運用の事故パターンを CI で予防している、と説明できる。CLAUDE.md の
`down -all 禁止` ルールを人間の注意ではなく機械で担保する話として繋げられる。

## C4 カバレッジ計測＋PRコメント

**やること:** `go test -coverprofile` を取り、[octocov](https://github.com/k1LoW/octocov) で
PRにカバレッジをコメント。`.octocov.yml` で「前回より下がったら警告」を設定。

**面接で語れるポイント:** 「カバレッジ○%を目標にする」ではなく
「**下げない**ことをゲートにする」方針を選んだ理由（数値目標はテストの質を歪める）。
リファクタ#6（scout_interactor テスト追加）の前後でカバレッジが動くので、実データで語れる。

## C5 セキュリティスキャン

**やること:**

- `govulncheck ./...` を CI に追加（Go 標準の脆弱性DB照合。**実際に呼んでいる関数単位**で判定する点が偉い）
- [gitleaks](https://github.com/gitleaks/gitleaks) でシークレットのコミット検出
- `dependabot.yml` で gomod / npm / github-actions の3エコシステムを週次更新
- （C6の後で）Trivy によるイメージスキャン

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

**面接で語れるポイント:** テストピラミッドの実践。「E2Eを薄く保つ判断」は
「E2Eをたくさん書きました」より評価される。flaky テストにどう向き合うかは頻出質問。

## C8 リリース自動化

**やること:** [tagpr](https://github.com/Songmu/tagpr) で「リリースPRをマージしたら
自動でタグ＋GitHub Release＋CHANGELOG」の流れを作る。C6と繋げて、タグ push で
バージョン付きイメージを GHCR に push するところまで。

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
