# seed.sql から推定したスキーマ

`backend/scripts/seed.sql`（18,179行）の `INSERT INTO` 文から逆算した想定テーブル・カラム一覧。
マイグレーション作成時のリファレンスとして使用する。

カラムの型・制約は seed からは完全には判別できないため、文脈から推測した型注記を付けている。
詳細な NULL 許容・デフォルト値・外部キー制約は実装時に決定すること。

## 全体像

17 テーブルを確認:

- 認証: `admin_users`, `users`
- プロフィール: `experiences`, `educations`, `skills`, `user_skills`
- Work Values 診断: `sessions`, `results`
- Career Interest 診断: `career_sessions`, `career_results`, `career_riasec_results`
- 企業: `companies`, `company_users`
- チーム: `teams`, `team_invitations`, `team_members`
- 求人: `job_postings`

## 1. 認証・管理系

### `admin_users` — 管理者

| カラム | 推定型 | 備考 |
|--------|--------|------|
| `id` | uuid | PK |
| `email` | text | UNIQUE（`ON CONFLICT (email)` より） |
| `name` | text | |
| `google_id` | text | Google OAuth subject |
| `api_token` | text | `admin_...` 形式の個人トークン |
| `role` | text | 例: `owner` |

### `users` — 候補者

| カラム | 推定型 | 備考 |
|--------|--------|------|
| `id` | uuid | PK |
| `line_id` | text | LINE ログイン連携 |
| `auth_type` | text | 例: `line` |
| `username` | text | URL パス用（例: `/profile/:username`） |
| `display_name` | text | |
| `email` | text | |
| `name` | text | |
| `is_public` | bool | プロフィール公開フラグ |
| `profile_color` | text | hex カラー（例: `#3D8B6E`） |
| `headline` | text | 255文字 |
| `location` | text | 100文字 |
| `about` | text | 2000文字 |
| `industry` | text | 100文字 |
| `job_type` | text | |
| `job_seeking_status` | text | |

## 2. プロフィール系

### `experiences` — 職歴

| カラム | 推定型 | 備考 |
|--------|--------|------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users |
| `company_name` | text | 必須 |
| `title` | text | 必須 |
| `start_year` | int2 | 1950〜来年 |
| `start_month` | int2 | 1〜12 |
| `end_year` | int2 | nullable、`is_current=true` の時 NULL |
| `end_month` | int2 | nullable |
| `is_current` | bool | |
| `description` | text | 自然文で記述 |

1ユーザあたり最大50件。

### `educations` — 学歴

| カラム | 推定型 | 備考 |
|--------|--------|------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users |
| `school` | text | 必須 |
| `degree` | text | nullable（学部・学科） |
| `start_year` | int2 | nullable |
| `end_year` | int2 | nullable |

1ユーザあたり最大20件。

### `skills` / `user_skills`

```
skills(id, name)                    -- スキルマスタ
user_skills(user_id, skill_id)      -- 中間テーブル
```

- `skills.name` 100文字以下
- ユーザあたり最大50件

## 3. Work Values 診断系

### `sessions` — 診断セッション

| カラム | 推定型 | 備考 |
|--------|--------|------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users |
| `circular_triads` | int | 循環三つ組の数 d |
| `consistency_coefficient` | numeric | ζ = 1 - d/d_max |
| `consistency_level` | text | `high`/`medium`/`low`/`very_low` |
| `purpose` | text | 診断の目的区分 |

### `results` — 21 ニーズごとのスコア

| カラム | 推定型 | 備考 |
|--------|--------|------|
| `session_id` | uuid | FK → sessions |
| `need_id` | text | 例: `creativity`, `autonomy` |
| `mu` | numeric | Bradley-Terry 強度 |
| `se` | numeric | 標準誤差 |
| `display_score` | numeric | 0–100 表示用 |
| `rank` | int2 | 1–21 |

PK は `(session_id, need_id)` が妥当。

## 4. Career Interest 診断系

### `career_sessions`

`(id, user_id)` のみ。Work Values と違い整合性指標は持たない設計。

### `career_results` — 基本興味領域

| カラム | 備考 |
|--------|------|
| `session_id` | FK |
| `basic_interest_id` | 興味領域 ID |
| `score` | スコア |
| `rank` | 順位 |

### `career_riasec_results` — RIASEC 6 タイプ集約

| カラム | 備考 |
|--------|------|
| `session_id` | FK |
| `riasec_type` | `R`/`I`/`A`/`S`/`E`/`C` |
| `score` | |
| `rank` | |

## 5. 企業・チーム系

### `companies`

| カラム | 備考 |
|--------|------|
| `id` | PK（uuid） |
| `name` | |
| `industry` | |
| `size` | 従業員規模区分 |
| `location` | |
| `approval_status` | 審査状況 |
| `plan` | 契約プラン |
| `website` | URL |

### `company_users`

`(id, company_id, email, name, google_id, role)` — 企業側ユーザー。Google OAuth 想定。

### `teams`

`(id, company_id, name, target_count)` — `target_count` は目標回答人数。

### `team_invitations`

| カラム | 備考 |
|--------|------|
| `id` | PK |
| `team_id` | FK |
| `token` | 招待リンク用トークン |
| `assigned_name` | 事前割り当て名 |
| `expires_at` | 有効期限 |
| `used_at` | 使用日時（nullable） |

### `team_members`

| カラム | 備考 |
|--------|------|
| `id` | PK |
| `team_id` | FK |
| `invitation_id` | FK → team_invitations |
| `name` | |
| `wv_vector` | **Work Values ベクトル（pgvector 想定）** |
| `ci_vector` | **Career Interest ベクトル（pgvector 想定）** |
| `completed_at` | 回答完了日時 |

チームメンバー単位でベクトルを直接保持し、集約・比較に使う設計。

## 6. 求人系

### `job_postings`

カテゴリごとに整理:

**基本情報**
- `id` (PK), `company_id`, `team_id`, `created_by` (FK → company_users)
- `status`（例: `open`）
- `title`, `job_category`, `employment_type`, `hiring_count`

**本文**
- `description`（仕事内容）
- `appeal_points`（アピールポイント）
- `challenges`（難所・チャレンジ）
- `team_description`（チーム紹介）
- `skills_gained`（身につくスキル）
- `content_blocks` **jsonb** — リッチレイアウト。CLAUDE.md の求人票PDFワークフローで生成される
- `tags` **jsonb** — 文字列配列

**応募要件**
- `required_qualifications`
- `preferred_qualifications`

**就業条件**
- `work_location`, `work_location_change_scope`, `job_description_change_scope`
- `contract_type`（例: `無期`）, `probation_period`
- `work_hours`, `break_time`, `holidays`

**報酬・福利厚生**
- `salary_min`, `salary_max`（int、単位は万円と推測）
- `salary_detail`（text、固定残業代等の補足）
- `insurance`, `smoking_policy`, `benefits`, `remote_policy`

**選考**
- `selection_process`
- `published_at` (timestamptz)

## CLAUDE.md 記載だが seed に含まれないテーブル

以下のテーブルは CLAUDE.md のワークフロー説明から存在が示唆されるが、seed.sql にはデータがない。マイグレーション作成時に追加が必要:

- **職務経歴書アップロード** — `resumes` / `resume_uploads` 系（`status: pending/reviewing/approved`、PDF バイナリ or パス、下書き JSON、2人承認ロジック）
- **求人票PDFアップロード** — `job_pdf_uploads` 系（`status`, `job_posting_id` 紐付け、`photo_urls`、プロンプト）
- **AIレポート** — セッション単位の AI レポート本文格納（`content` text）
- **統合レポート** — ユーザー単位の統合レポート本文格納

## 想定される拡張・留意点

- 全テーブルとも `created_at` / `updated_at` は seed に出ないため触れていないが、実装時には追加すべき。
- `job_postings.salary_min/max` の単位は `月給50万円〜83万円` という記述と `600, 1000` という値から「千円」単位の可能性が高い。実装時に仕様を確定すること。
- pgvector 拡張が前提（`team_members.wv_vector`, `ci_vector`）。マイグレーションで `CREATE EXTENSION vector` が必要。
- `sessions` テーブル名は候補者の Work Values 診断セッション用に使われている。OAuth セッションと衝突するので注意（別テーブル名推奨）。
