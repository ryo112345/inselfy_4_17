# コントローラ経路統一リファクタ 手順書

DB直結コントローラ（`*pgxpool.Pool` を直接持つもの）を、user_controller と同じ
クリーンアーキ経路に移行する。**どのセッションから再開しても同じ品質で進められるよう、
この手順書だけで作業が完結するように書いてある。**

## 背景と方針（決定済み・再議論しない）

backend には現在2系統の経路が混在している:

- **系統1（正規）:** controller → `port.XxxInputPort` → usecase interactor → `port.XxxRepository` → gateway → DB
- **系統2（直結）:** controller が `*pgxpool.Pool` を持ち、生SQL・ビジネスロジック・レスポンス構築を全部やる

方針は以下で確定している:

1. **admin系コントローラ（`admin_*_controller.go`）は直結のまま残す。** 内部ツールに儀式は不要という割り切り。移行対象外。
2. **それ以外の直結コントローラ8つを全て系統1に移行する。** 経路は user_controller と完全に同じ形。
3. **動的SQL・複合読み取りは「QueryService」port を新設して吸収する。** interactor は飛ばさない。
   経路は常に controller → InputPort → interactor → (Repository | QueryService) → gateway。
   変わるのは interactor が呼ぶ port の種類だけ。
4. read model（entity に対応しない画面用の複合構造体）は domain パッケージに置いてよい。
   前例: `domain/scout` の `ScoutMessageWithNames`。
5. 仕上げに import 制限リント（depguard）で再発を機械的に防止する。

## 対象一覧と進捗

易しい順。**1コントローラ = 1コミット**で進め、完了したらチェックを入れてコミットに含めること。

| # | 状態 | コントローラ | 行数 | 備考 |
|---|------|-------------|------|------|
| 1 | [x] | team_diagnose_controller.go | 101 | 最小。練習台に最適 |
| 2 | [x] | saved_candidate_controller.go | 192 | 単純CRUD |
| 3 | [ ] | similar_users_controller.go | 251 | 類似度読み取り |
| 4 | [ ] | company_profile_controller.go | 365 | `port.FileStorage` も併用中 |
| 5 | [ ] | job_application_controller.go | 413 | **ハイブリッド**: InputPort と pool を両方持つ。pool 側だけ移行 |
| 6 | [ ] | interview_controller.go | 642 | **ハイブリッド**: pool + ConversationRepository 等の port + TxManager を持つ。日程調整ロジックの interactor 抽出が本体 |
| 7 | [ ] | company_team_controller.go | 910 | ハンドラ13個。public/company 両方から使われる（initializer.go の2箇所で生成） |
| 8 | [ ] | talent_search_controller.go | 1261 | 最難関。動的WHERE句組み立て＋類似度スコアリング。スコアリングは interactor でユニットテスト必須 |

移行対象外（直結のまま）: admin_user / admin_company / admin_report / admin_ci_report / admin_integrated_report の5つ。

## 1コントローラあたりの移行手順

### Step 0: 現状把握

- 対象コントローラを読み、ハンドラごとに「SQL部分」「ビジネスロジック部分（計算・分岐・認可）」「HTTP部分（パラメータ解釈・レスポンス構築）」を切り分ける。
- `initializer.go` で該当コントローラの生成・ルーティング箇所を確認する。
- **移行前にレスポンスを記録する**（Step 5 で比較するため）:
  代表的なエンドポイントを curl で叩き、レスポンス JSON をファイルに保存しておく。
  認証が必要なものは既存の開発用アカウントでトークンを取る。DBデータが必要なら投入してから記録する。

### Step 1: port 定義

`backend/internal/port/<feature>_port.go` に書く（既存ファイルがあれば追記）。

- ユースケースの入口: `type XxxInputPort interface { ... }`
- entity を返す永続化: `type XxxRepository interface { ... }`（既存があれば再利用）
- 複合読み取り・動的SQL: `type XxxQueryService interface { ... }`
  - メソッドは read model を返す。例:
    ```go
    type TalentSearchQueryService interface {
        SearchCandidates(ctx context.Context, f scout.TalentSearchFilter) ([]*scout.TalentCard, int, error)
    }
    ```
- read model・フィルタ構造体は関連する `domain/<feature>` パッケージに定義する。
  適切な既存パッケージが無ければ新設してよい（例: `domain/talentsearch`）。

### Step 2: gateway 実装

`backend/internal/adapter/gateway/db/sqlc/` に置く。

- Repository: `<feature>_repository.go`、コンストラクタ `NewXxxRepository(pool)`（既存の命名に合わせる）
- QueryService: `<feature>_query_service.go`、コンストラクタ `NewXxxQueryService(pool)`
- **生SQL・動的WHERE句組み立てはここに置いてよい。** sqlc に乗せる必要はない。
  コントローラから SQL とスキャン処理をほぼそのまま移植する。
- 静的なクエリで sqlc に乗るものは `queries/*.sql` に追加して `make sqlc` で再生成してもよい（任意）。

### Step 3: interactor 作成

`backend/internal/usecase/<feature>_interactor.go` に書く。

- コンストラクタ `NewXxxInteractor(...)` は port インターフェースを受け取り、`port.XxxInputPort` を満たす struct を返す。既存の `user_interactor.go` を雛形にする。
- コントローラにあった**ビジネスロジック（スコアリング・類似度計算・状態遷移・件数制限チェック等）は全てここへ移す**。SQLは移さない（Step 2 へ）。
- 認可（「この company はこのリソースを見てよいか」）も interactor に置く。ユーザーIDの取り出し自体（JWT/セッション）は controller/middleware の仕事。
- **ロジックを含む interactor にはユニットテストを書く**（`<feature>_interactor_test.go`）。
  モックは `usecase/mocks_test.go` の既存スタイルに従い追記する。
  特に #8 talent_search のスコアリングはテスト必須。

### Step 4: controller を痩せさせる + DI 配線

- コントローラの struct から `pool *pgxpool.Pool` を外し、`input port.XxxInputPort` に置き換える。
  ハンドラは「パラメータ解釈 → input 呼び出し → presenter でレスポンス変換」だけにする。
- レスポンス構築は `adapter/http/presenter` に移す。同名フィールド15個以上のフラットな詰め替えなら
  goverter 化を検討（CLAUDE.md の線引きルール参照）。それ未満は手書き。
- エラーは `controller/errors.go` の `handleError` / `badRequest` を使う。
- `initializer.go` の生成箇所を差し替える:
  ```go
  xxxCtrl := httpcontroller.NewXxxController(
      usecase.NewXxxInteractor(sqlcgw.NewXxxQueryService(pool), ...),
  )
  ```
- コントローラファイルから `pgx` / `pgxpool` / `pgtype` の import が消えていることを確認する。

### Step 5: 検証

```bash
cd backend
go build ./...
go vet ./...
make test
```

- Step 0 で保存したレスポンスと移行後のレスポンスを diff し、**完全一致**を確認する
  （フィールドの順序・null の扱い・omitempty の挙動が変わりやすいので注意）。
- 差分が出たら「移行後が正しい」と勝手に判断せず、移行前の挙動に合わせる。
  挙動変更はこのリファクタでは行わない。

### Step 6: コミット

```
refactor(backend): migrate <feature> controller to clean route
```

1コントローラ1コミット。手順書のチェックボックス更新も同じコミットに含める。

## 全件完了後の仕上げ（別コミット）

1. **dead code 削除:** `port/scout_port.go` 末尾の `TalentSearchInputPort` は未使用の旧定義。
   新しい talent search port を作る際に削除するか、そこで流用する。
2. **depguard 導入:** golangci-lint の depguard で
   「`internal/adapter/http/controller` から `github.com/jackc/pgx` 系の import を禁止」を設定。
   admin コントローラは例外指定（もしくは admin だけサブパッケージ `controller/admin/` に切り出して
   パッケージ単位で例外にする方がルールが単純になる）。
3. **CLAUDE.md 追記:** 「admin コントローラのみ pool 直結可、それ以外は InputPort 経由必須。
   複合読み取りは QueryService port を使う」を開発ルールに追記。

## よくある判断の指針

- **「この処理は interactor と gateway どっち？」** → SQL・スキャン・pgtype 変換は gateway。
  取得後の計算・並べ替え・フィルタ・判定は interactor。境界で迷ったら「DBが無くてもテストできるか」で分ける。
- **「read model はどこに置く？」** → domain パッケージ。DBの行構造ではなく「ユースケースが返したい形」で定義する。
- **「presenter の変換が面倒」** → 手書きでよい。goverter 化は CLAUDE.md の線引き（15フィールド以上・フラット・計算なし）を満たす場合だけ。
- **「移行中に既存バグを見つけた」** → このリファクタでは直さない。挙動を維持したまま移行し、バグは別途報告する。
