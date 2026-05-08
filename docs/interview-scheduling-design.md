# 面接日程調整 & メッセージ連携 設計書

## ステータス: 設計中
## 最終更新: 2026-05-08

---

## 1. 概要

応募管理画面から候補者にメッセージを送信し、面接日程を提案・確定できる機能。
採用担当者にはカレンダービュー（週表示）で面接予定を俯瞰でき、
候補者にはシンプルなスロット選択UIで日程を確定できる。

### ゴール
- 採用担当者: 応募詳細 → メッセージ送信 → 日程提案 → カレンダーで俯瞰
- 候補者: 通知 → 日程カードから選択 → 確定 → 自分の面接予定を確認

---

## 2. 機能一覧

### 2.1 応募詳細からメッセージ送信（既存基盤を活用）
- 応募詳細パネルに「メッセージを送る」ボタン追加
- 既存の会話があればそこに遷移、なければ自動作成して遷移
- 既存API: `POST /api/company/messages/conversations`

### 2.2 面接日程提案（新規）
- 採用担当者がメッセージ画面 or 応募詳細から「日程を提案」
- 候補日時を複数選択（カレンダーUIで空き時間をクリック）
- 構造化メッセージとして候補者に送信
- 候補者は提案された日時カードから1つ選んで確定

### 2.3 面接カレンダー（新規）
- `/company/calendar` に週表示カレンダー
- 縦軸=時間（8:00-21:00）、横軸=曜日
- 確定済み面接がブロックで表示（候補者名・求人名）
- ブロッククリックで面接詳細

### 2.4 候補者の面接予定（新規）
- `/interviews` に自分の面接予定一覧
- 提案中（未回答）/ 確定済み / 完了 のタブ分け

---

## 3. データベース設計

### 3.1 interview_slots テーブル（面接提案の候補日時）

```sql
CREATE TABLE interview_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 紐づく応募
    application_id UUID NOT NULL REFERENCES job_applications(id),
    -- 提案者（採用担当者）
    proposed_by UUID NOT NULL,
    -- 日時
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    -- ステータス: proposed / selected / rejected / expired
    status TEXT NOT NULL DEFAULT 'proposed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interview_slots_application ON interview_slots(application_id);
CREATE INDEX idx_interview_slots_start_time ON interview_slots(start_time);
```

### 3.2 interviews テーブル（確定した面接）

```sql
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 紐づく応募
    application_id UUID NOT NULL REFERENCES job_applications(id),
    -- 参加者
    company_id UUID NOT NULL REFERENCES company_accounts(id),
    candidate_id UUID NOT NULL REFERENCES users(id),
    -- 面接情報
    title TEXT NOT NULL DEFAULT '面接',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    -- 場所・リンク（オンラインならURL、対面なら住所）
    location TEXT,
    meeting_url TEXT,
    -- メモ（社内用）
    internal_notes TEXT,
    -- ステータス: scheduled / completed / cancelled / no_show
    status TEXT NOT NULL DEFAULT 'scheduled',
    -- 選択されたスロット（あれば）
    selected_slot_id UUID REFERENCES interview_slots(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interviews_company ON interviews(company_id);
CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_interviews_application ON interviews(application_id);
CREATE INDEX idx_interviews_start_time ON interviews(start_time);
CREATE INDEX idx_interviews_status ON interviews(status);
```

### 3.3 interview_proposals テーブル（日程提案の親レコード）

```sql
CREATE TABLE interview_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id),
    company_id UUID NOT NULL REFERENCES company_accounts(id),
    candidate_id UUID NOT NULL REFERENCES users(id),
    -- 提案に添えるメッセージ
    message TEXT,
    -- ステータス: pending / confirmed / expired / cancelled
    status TEXT NOT NULL DEFAULT 'pending',
    -- 紐づくメッセージ（構造化メッセージ参照）
    message_id UUID,
    -- 有効期限（デフォルト: 提案から7日）
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interview_proposals_application ON interview_proposals(application_id);
CREATE INDEX idx_interview_proposals_status ON interview_proposals(status);

-- interview_slots に proposal への参照を追加
ALTER TABLE interview_slots ADD COLUMN proposal_id UUID REFERENCES interview_proposals(id);
CREATE INDEX idx_interview_slots_proposal ON interview_slots(proposal_id);
```

### 3.4 messages テーブル拡張（構造化メッセージ対応）

```sql
-- 既存の messages テーブルにカラム追加
ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text';
-- message_type: 'text' | 'interview_proposal' | 'interview_confirmed' | 'interview_cancelled'
ALTER TABLE messages ADD COLUMN metadata JSONB;
-- metadata 例:
-- interview_proposal: { "proposal_id": "uuid", "slots": [...] }
-- interview_confirmed: { "interview_id": "uuid", "start_time": "...", "end_time": "..." }
```

---

## 4. API 設計

### 4.1 面接日程提案

```
POST /api/company/interviews/propose
Authorization: JWT (company)
Content-Type: application/json

{
  "application_id": "uuid",
  "message": "以下の日程でご都合の良い日時をお選びください。",
  "slots": [
    { "start_time": "2026-05-12T10:00:00+09:00", "end_time": "2026-05-12T11:00:00+09:00" },
    { "start_time": "2026-05-12T14:00:00+09:00", "end_time": "2026-05-12T15:00:00+09:00" },
    { "start_time": "2026-05-13T10:00:00+09:00", "end_time": "2026-05-13T11:00:00+09:00" }
  ],
  "location": "Zoom（URLは確定後にお送りします）",
  "expires_in_days": 7
}

Response 201:
{
  "proposal_id": "uuid",
  "message_id": "uuid"
}
```

処理フロー:
1. interview_proposals レコード作成
2. interview_slots を複数作成
3. 構造化メッセージ（type: interview_proposal）を会話に送信
   - 会話がなければ自動作成
4. 通知を候補者に送信
5. 応募ステータスが "applied" or "screening" なら自動で "interview" に更新

### 4.2 候補者が日程を選択

```
POST /api/interviews/proposals/:proposalId/select
Authorization: JWT (candidate)

{
  "slot_id": "uuid"
}

Response 200:
{
  "interview": {
    "id": "uuid",
    "start_time": "...",
    "end_time": "...",
    "status": "scheduled"
  }
}
```

処理フロー:
1. 選択されたスロットを "selected" に、他を "rejected" に更新
2. proposal を "confirmed" に更新
3. interviews レコード作成（status: scheduled）
4. 確認メッセージ（type: interview_confirmed）を会話に送信
5. 通知を採用担当者に送信

### 4.3 企業側: 面接一覧（カレンダー用）

```
GET /api/company/interviews?from=2026-05-05&to=2026-05-11
Authorization: JWT (company)

Response 200:
{
  "interviews": [
    {
      "id": "uuid",
      "application_id": "uuid",
      "candidate_name": "田中太郎",
      "candidate_avatar_url": "...",
      "job_title": "バックエンドエンジニア",
      "start_time": "2026-05-12T10:00:00+09:00",
      "end_time": "2026-05-12T11:00:00+09:00",
      "location": "Zoom",
      "meeting_url": "...",
      "status": "scheduled"
    }
  ],
  "proposals": [
    {
      "id": "uuid",
      "candidate_name": "佐藤花子",
      "job_title": "フロントエンドエンジニア",
      "slots": [...],
      "status": "pending"
    }
  ]
}
```

### 4.4 候補者側: 自分の面接予定

```
GET /api/interviews
Authorization: JWT (candidate)

Response 200:
{
  "interviews": [...],
  "pending_proposals": [...]
}
```

### 4.5 面接キャンセル

```
POST /api/company/interviews/:interviewId/cancel
POST /api/interviews/:interviewId/cancel   (候補者側)
```

### 4.6 面接完了

```
POST /api/company/interviews/:interviewId/complete
```

---

## 5. フロントエンド設計

### 5.1 ページ構成

```
/company/applications     ← 既存（ボタン追加）
/company/messages          ← 既存（構造化メッセージ対応）
/company/calendar          ← 新規: 面接カレンダー
/company/calendar/propose  ← 新規: 日程提案モーダル/ページ

/messages                  ← 既存（構造化メッセージ対応）
/interviews                ← 新規: 候補者の面接予定
```

### 5.2 コンポーネント構成

```
frontend/src/features/interview/
├── types.ts                    # Interview, Proposal, Slot 型定義
├── api.ts                      # API関数
├── components/
│   ├── WeekCalendar.tsx         # 週カレンダー（メインビュー）
│   ├── CalendarHeader.tsx       # 週切り替えヘッダー
│   ├── TimeGrid.tsx             # 時間グリッド（8:00-21:00）
│   ├── InterviewBlock.tsx       # カレンダー上の面接ブロック
│   ├── SlotPicker.tsx           # 日程提案時のスロット選択UI
│   ├── ProposalCard.tsx         # メッセージ内の日程提案カード
│   ├── ProposalSlotList.tsx     # 候補日時のリスト（候補者が選ぶ）
│   ├── InterviewDetail.tsx      # 面接詳細パネル
│   └── InterviewList.tsx        # 候補者用の面接一覧
```

### 5.3 WeekCalendar コンポーネント仕様

```
┌──────────────────────────────────────────────────┐
│  ← 2026年5月 第2週 (5/11 - 5/17) →              │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┤
│      │ 月11 │ 火12 │ 水13 │ 木14 │ 金15 │ 土16 │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 8:00 │      │      │      │      │      │      │
│ 9:00 │      │ ████ │      │      │      │      │
│10:00 │      │ 面接 │      │ ████ │      │      │
│11:00 │      │ 田中 │      │ 面接 │      │      │
│12:00 │      │      │      │ 佐藤 │      │      │
│13:00 │      │      │      │      │      │      │
│14:00 │      │      │ ████ │      │      │      │
│15:00 │      │      │ 面接 │      │      │      │
│16:00 │      │      │ 鈴木 │      │      │      │
│      ...    ...    ...    ...    ...    ...     │
└──────────────────────────────────────────────────┘
```

- 1時間 = 64px（スクロール可能）
- 面接ブロック: 色分け（scheduled=青, pending=黄点線, completed=灰）
- ブロックホバーで詳細ポップオーバー
- 空き時間クリックで「日程提案に追加」

### 5.4 ProposalCard コンポーネント（メッセージ内表示）

採用担当者が送った日程提案がチャット内でカード表示される。

```
┌─────────────────────────────────────┐
│ 📅 面接日程のご提案                    │
│                                     │
│ 以下の日程でご都合の良い日時を         │
│ お選びください。                      │
│                                     │
│ ┌─────────────────────────────┐     │
│ │ ○ 5/12(月) 10:00 - 11:00   │     │
│ └─────────────────────────────┘     │
│ ┌─────────────────────────────┐     │
│ │ ○ 5/12(月) 14:00 - 15:00   │     │
│ └─────────────────────────────┘     │
│ ┌─────────────────────────────┐     │
│ │ ○ 5/13(火) 10:00 - 11:00   │     │
│ └─────────────────────────────┘     │
│                                     │
│     [この日程で確定する]              │
│                                     │
│ 回答期限: 5/19(月)まで              │
└─────────────────────────────────────┘
```

### 5.5 応募詳細パネルへの追加

既存の応募詳細パネル（右側）に以下を追加:
- ステータスボタン群の下に「メッセージを送る」「日程を提案」ボタン
- 確定済み面接があれば面接情報カード表示

---

## 6. 通知連携

### 6.1 新しい通知タイプ

| タイプ | 対象 | 内容 |
|--------|------|------|
| interview_proposed | 候補者 | 「○○社から面接日程の提案が届きました」 |
| interview_confirmed | 採用担当者 | 「田中太郎さんが5/12 10:00の面接を確定しました」 |
| interview_cancelled | 双方 | 「面接がキャンセルされました」 |
| interview_reminder | 双方 | 「明日10:00から○○社の面接があります」（将来） |

### 6.2 WebSocket連携

既存の WebSocket 基盤を活用:
- 構造化メッセージも通常メッセージと同様にリアルタイム配信
- フロントエンドで `message_type` を見て適切なカードコンポーネントをレンダリング

---

## 7. 実装順序

### Phase 1: 応募詳細 → メッセージ送信導線（0.5日） ✅ 完了
- [x] 応募詳細パネルに「メッセージを送る」ボタン追加
- [x] クリックで `/company/messages?candidateId={id}&candidateName={name}` に遷移
- [x] 会話がなければ新規会話モードで自動作成

### Phase 2: 構造化メッセージ基盤（1日） ✅ 完了
- [x] messages テーブルに message_type, metadata カラム追加（マイグレーション `20260509100001`）
- [x] バックエンド: Message エンティティ・リポジトリ・プレゼンターに message_type, metadata 追加
- [x] sqlc 再生成済み
- [x] フロントエンド: Message 型に messageType, metadata 追加
- [x] フロントエンド: MessageBubble で構造化メッセージ（confirmed/cancelled）のカード表示

### Phase 3: 面接提案・確定フロー（2-3日） ✅ 完了
- [x] DB: interview_proposals, interview_slots, interviews テーブル作成（マイグレーション `20260509100002`）
- [x] バックエンド: interview ドメイン（entity, errors）、port インターフェース
- [x] バックエンド: リポジトリ実装（proposal, slot, interview）
- [x] バックエンド: InterviewController（propose, selectSlot, listByCompany, listByCandidate, cancel, getProposalSlots）
- [x] バックエンド: ルーター登録（/api/company/interviews/*, /api/interviews/*）
- [x] フロントエンド: interview feature（types, api）
- [x] フロントエンド: ProposalCard コンポーネント（メッセージ内日程選択UI）
- [x] フロントエンド: SlotPicker モーダル（日程提案UI）
- [x] フロントエンド: 応募詳細に「日程を提案」ボタン追加
- [x] フロントエンド: MessageBubble で interview_proposal タイプをProposalCardで表示
- [x] メッセージ連携: 提案時に構造化メッセージ（interview_proposal）を自動送信
- [x] メッセージ連携: 確定時に interview_confirmed、キャンセル時に interview_cancelled メッセージ自動送信
- [x] 応募ステータス自動更新: 提案時に applied/screening → interview に自動変更
- [ ] 通知連携（未実装、次回対応可能）

### Phase 4: 面接カレンダー（2-3日） ✅ 完了
- [x] フロントエンド: WeekCalendar, CalendarHeader, InterviewBlock, InterviewDetailPanel コンポーネント
- [x] `/company/calendar` ページ（フルブリードレイアウト）
- [x] ナビゲーションに「カレンダー」タブ追加
- [x] 週切り替え（前週/次週/今週）、曜日ヘッダー、時間グリッド（8:00-21:00）
- [x] 面接ブロック（ステータス別色分け: scheduled=青, completed=緑, cancelled=灰, no_show=赤）
- [x] 現在時刻インジケーター（赤線）
- [x] 面接クリックで詳細パネル（候補者名、日時、場所、ミーティングURL、キャンセル機能）
- [x] カレンダーからの日程提案フロー（空き時間クリック→応募選択→提案ページに遷移、時間帯プリセット）

### Phase 5: 候補者の面接予定ページ（1日） ✅ 完了
- [x] `/interviews` ページ（Sidebarレイアウト付き）
- [x] タブUI: 提案中 / 確定済み / 過去
- [x] 提案中タブ: ProposalCardを再利用した日程選択UI（企業名・求人名付き）
- [x] 確定済みタブ: 日時・場所・ミーティングリンク表示、キャンセル機能、残り日数バッジ
- [x] 過去タブ: ステータスバッジ（完了/キャンセル/不参加）付き一覧
- [x] サイドバーに「面接予定」リンク追加

---

## 8. 実装メモ（セッション引き継ぎ用）

### 完了した作業
- Phase 1: 応募詳細 → メッセージ送信導線
- Phase 2: 構造化メッセージ基盤（DB, バックエンド, フロントエンド）
- Phase 3: 面接提案・確定フロー（DB, バックエンド全レイヤー, フロントUI）
- Phase 4: 面接カレンダー（/company/calendar、週表示カレンダーUI）
- Phase 5: 候補者の面接予定ページ（/interviews、タブUI）

### 次にやること
- 通知連携（interview_proposed, interview_confirmed, interview_cancelled）

### Phase 3 で作成したファイル
- `backend/migrations/20260509100002_add_interview_tables.{up,down}.sql`
- `backend/internal/domain/interview/{entity,errors}.go`
- `backend/internal/port/interview_port.go`
- `backend/internal/adapter/gateway/db/sqlc/queries/interviews.sql`
- `backend/internal/adapter/gateway/db/sqlc/interview_repository.go`
- `backend/internal/adapter/http/controller/interview_controller.go`
- `frontend/src/features/interview/{types,api}.ts`
- `frontend/src/features/interview/components/{ProposalCard,SlotPicker}.tsx`

### Phase 4 で作成・変更したファイル
- `frontend/src/features/interview/components/{WeekCalendar,CalendarHeader,InterviewBlock,InterviewDetailPanel}.tsx`
- `frontend/src/app/company/calendar/page.tsx`
- `frontend/src/app/company/CompanyHeader.tsx`（カレンダーナビ追加、fullBleedPaths追加）
- `frontend/src/app/company/CompanyAuthGuard.tsx`（fullBleedPaths追加）

### Phase 5 で作成・変更したファイル
- `frontend/src/app/interviews/{layout,page}.tsx`
- `frontend/src/app/components/Sidebar.tsx`（面接予定リンク・CalendarIcon追加）

### 既存コードの重要な参照先
- メッセージング domain: `backend/internal/domain/messaging/`
- メッセージング port: `backend/internal/port/messaging_port.go`
- メッセージング usecase: `backend/internal/usecase/messaging_interactor.go`
- メッセージング controller: `backend/internal/adapter/http/controller/messaging_controller.go`
- メッセージング repository: `backend/internal/adapter/gateway/db/sqlc/`
- フロント メッセージング: `frontend/src/features/messaging/`
- 応募詳細ページ: `frontend/src/app/company/applications/page.tsx`
- 企業メッセージページ: `frontend/src/app/company/messages/page.tsx`
- 候補者メッセージページ: `frontend/src/features/messaging/components/MessagesPageContent.tsx`
- 通知 domain: `backend/internal/domain/notification/`
- WebSocket: `backend/internal/adapter/ws/`
