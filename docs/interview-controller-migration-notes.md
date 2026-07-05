# interview_controller 移行準備メモ（リファクタ #6）

`docs/controller-clean-route-refactor.md` の #6 を新しいセッションで実施するための事前分析。
共通手順は手順書に従い、このメモは interview 固有の情報だけをまとめる。

## 現状構造（642行・ハイブリッド）

- struct は `pool` に加えて既存 port（`InterviewProposalRepository` / `InterviewSlotRepository` /
  `InterviewRepository` は **コンストラクタ内で `sqlcrepo.New…(pool)` を自前生成**、
  `ConversationRepository` / `MessageRepository` / `ConversationParticipantRepository` / `TxManager` はDI）と
  `WSNotifier` を持つ。
- **未使用の事前設計資産がある（設計書 `docs/interview-scheduling-design.md` 由来）:**
  - `port.InterviewInputPort`（interview_port.go:10）— 定義済みだが実装ゼロ・参照ゼロ
  - `domain/interview` の `ProposeInput` / `SelectSlotInput` / `InterviewWithNames` / `errors.go` のセンチネル群
  - これを土台に流用する。ただし**現実装と署名がズレている**（下記「InputPort 改訂案」）。

## ハンドラ別分析（SQL / ロジック / HTTP の切り分け）

| # | handler | route (auth) | pool直結SQL | interactor へ移すロジック |
|---|---------|--------------|-------------|---------------------------|
| 1 | Propose | POST /api/company/interviews/propose (companyJwtMW) | ①`job_applications` から candidate_id 取得（company所有チェック兼用）②提案後の `status='interview'` 自動更新（tx外・エラー無視 `_, _ =`） | tx内: pending取消→proposal作成→slot作成→会話find-or-create→提案メッセージ→UpdateLastMessageAt→UpdateMessageID。デフォルト値 expiresInDays=7 / durationMinutes=60 |
| 2 | SelectSlot | POST /api/interviews/proposals/:proposalId/select (jwtMW) | なし | 認可（CandidateID==userID）、pending/期限チェック、スロット範囲内の時刻絞り込み、tx内 slot selected / RejectOthers / proposal confirmed / interview 作成 / 確定メッセージ |
| 3 | ListByCompany | GET /api/company/interviews?from&to (companyJwtMW) | 候補者名/avatar と jobTitle を **N+1** で取得 | from/to デフォルト（今日〜+7日）は controller 側。enrich は QueryService へ |
| 4 | ListByCandidate | GET /api/interviews (jwtMW) | companyName / jobTitle を **N+1**（interviews と pendingProposals 両方） | pendingProposals 組み立て（ListPendingByCandidate + ListByProposal + 社名/求人名） |
| 5 | CancelInterview | 会社/候補者**両ルート**から同一ハンドラ | なし | companyID/userID 両取り認可、tx内 status更新+キャンセルメッセージ |
| 6 | GetPendingProposal | GET /api/company/interviews/pending/:applicationId | 1クエリ（pending かつ未失効の最新1件） | ほぼ素通し。**company スコープなし**（コメントで明示済み・挙動維持） |
| 7 | GetProposalSlots | GET /api/interviews/proposals/:proposalId/slots | なし | 認可なしの素通し read |

### 挙動維持の要注意ポイント（勝手に直さない）

- SelectSlot / CancelInterview の tx 内で **会話取得に失敗したら `return nil`**（メッセージ送信を
  スキップして成功扱い）。エラーにしない。
- Propose の `status='interview'` 自動更新は **tx の外**で実行され、エラーは握りつぶし。
- GetPendingProposal はスキャン失敗（レコードなし含む）で **200 `{"hasPending": false}`**。
- WS通知（取消済み提案の `proposal_cancelled`）は **tx 成功後**に controller で送信。
- レスポンスは全ハンドラ `map[string]interface{}` 手組み。キー名（camelCase）と
  `interviews` / `pendingProposals` 等の構造を厳密に維持する。

## 設計方針（提案）

- **InputPort 改訂案**（既存定義を現実装に合わせて書き換える）:
  - `Propose(ctx, ProposeInput) (*ProposeOutput, error)` — Output に `Proposal` / `Slots` /
    `CancelledProposalIDs` を含める。**WS送信は controller に残す**（delivery 関心事。
    `SetWS` / `WSNotifier` は controller のまま）。
  - `SelectSlotInput` に `StartTime` / `EndTime *time.Time`（スロット内絞り込み。現定義に無い）を追加。
  - `ListByCompany(ctx, companyID, from, to) ([]*InterviewWithNames, error)` —
    既存定義は proposals も返す署名だが現実装は返していないので縮める。
  - `ListByCandidate(ctx, candidateID) ([]*InterviewWithNames, []*ProposalWithDetails, error)` —
    pendingProposals 用に companyName / jobTitle / slots 込みの read model を `domain/interview` に新設。
  - `CancelInterview(ctx, interviewID, companyID, userID string) error` — 両取り認可を interactor へ。
  - `GetPendingProposal(ctx, applicationID)` / `GetProposalSlots(ctx, proposalID)` を追加（既存定義に無い）。
- **QueryService（InterviewQueryService）新設**: N+1 の enrich クエリ
  （候補者名+avatar / 会社名 / 求人タイトル）、`ApplicationCandidateID(applicationID, companyID)`、
  `MarkApplicationInterviewing(applicationID)`（status自動更新）、GetPendingProposal の1クエリ。
  N+1 は **そのまま維持**（クエリ最適化は挙動変更につながるのでやらない）。
- **TxManager は interactor が受け取る**。前例: scout / messaging / skill の各 interactor。
  テスト用 `inlineTxManager` スタブも mocks_test.go に既存。
- **エラー**: `domain/interview/errors.go` のセンチネルは **controller/errors.go に未登録**。
  登録する場合はメッセージが現実装と一致するか要確認:
  - 一致: ErrInvalidTimeRange / ErrProposalNotPending / ErrProposalExpired、
    notFound 系 "proposal not found" / "slot not found" / "interview not found"
  - **不一致**: `ErrTooManySlots` = "maximum 10 slots per proposal" だが現実装は "maximum 10 slots"。
    → センチネル側の文言を現実装に合わせて修正する（レスポンス完全一致が最優先）。
  - センチネルが無いもの: "application not found"(404) / "slot does not belong to this proposal" /
    "selected time must be within the slot range" / "not your proposal"(403) 等 → 追加が必要。
  - リクエスト形式エラー（Bind失敗・RFC3339パース失敗）は controller に残してよい。
- interactor のユニットテスト: Propose のデフォルト値・取消→作成の流れ、SelectSlot の
  認可/期限/範囲チェック、CancelInterview の両取り認可、が最低ライン。

## Step 0 検証レシピ（前セッションで確立済み）

- DB: `docker start inselfy-db-1`（localhost:5434、`.env` の DATABASE_URL 参照）
- backend: `cd backend && go run ./cmd/api`（**port 8081**）。終了時は kill + `docker stop inselfy-db-1`
- **企業ログイン**: `admin@inselfy.example.com` / `password123`
  （2026-07-05 に bcrypt ハッシュを開発DBへ設定済み）
  `curl -c cookies.txt -X POST -H "Content-Type: application/json" -d '{"email":"...","password":"password123"}' http://localhost:8081/api/company/auth/login`
  他のシード企業はダミーハッシュのままなので、必要なら同じ bcrypt 値
  （`$2a$10$22z7IIQjiLL5oayDTNPvrOAyLdakMByYTXqn8S20C/ya7FtDUwXrC`）を UPDATE する。
- **候補者ログイン**: `POST /api/admin/users/{userId}/bypass-login`（開発環境の adminGroup は
  ミドルウェアなし）→ `inselfy_token` cookie が付与される。cookie jar 分けて保存する。
- **データ**: `admin@inselfy` 企業には job_applications が **0件**。Propose を叩くには
  応募がある企業（`SELECT company_id, count(*) FROM job_applications GROUP BY 1` で確認、
  シードでは b0000000-… 系）でログインするか、応募を1件作る。
  interview_proposals は26件、interviews は4件シード済みなので GET 系はすぐ記録できる。
- **POST系（Propose/SelectSlot/Cancel）はDB状態を変える**ため、移行前後で「同一入力で1回ずつ実行し、
  ID/タイムスタンプ以外のレスポンス構造・値を比較」する方式にする（GET系は完全 diff でよい）。
  実行前に対象テーブル（interview_proposals / interview_slots / interviews / messages）の
  件数スナップショットを取っておくと差分確認が楽。
- zsh 注意: URL に `?` を含む curl は必ずクォート。フラグを変数にまとめない（word splitting されない）。

## initializer の該当箇所

- 生成: initializer.go:124-127（`NewInterviewController(pool, convRepo, msgRepo, participantRepo, tx)`）
- ルート: :640-659（company 4本 + candidate 4本、CancelInterview は両グループから）
- WS: :701 `interviewCtrl.SetWS(wsHub)` — 移行後もこの形を維持できる
