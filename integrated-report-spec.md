# Seedデータ作成ガイド

プラットフォームを「活気がある」状態に見せるためのseedデータ作成手順書。

## 目標規模

| 項目 | 目標数 | 現状 |
|------|--------|------|
| 企業 | 30社 | 1社（inselfy） |
| 求人 | 130件前後（1社あたり3〜6件） | 6件（inselfy） |
| 候補者ユーザー | 100名 | 3名 |
| チーム | 各社2〜4チーム | inselfy 3チーム |
| 診断済みメンバー | 各チーム3〜5名 | inselfy 12名 |

---

## Phase 1: 企業を増やす

### 手順
1. `companies` テーブルにINSERT
2. `company_users` テーブルに企業管理者をINSERT
3. 企業プロフィールをUPDATEで埋める

### 必須フィールド
- `name`, `approval_status`（'approved'にする）, `plan`（'pro'または'enterprise'）

### 全フィールド一覧
```sql
INSERT INTO companies (id, name, industry, size, location, approval_status, plan, website)
VALUES (...);

UPDATE companies SET
  mission = '...',
  description = '...',
  founded_year = 2020,
  employee_count = '50名',
  culture = '...',
  benefits = E'福利厚生1\n福利厚生2\n福利厚生3',  -- ⚠️ 改行区切り
  avg_age = 32.5,
  gender_ratio = '男性55% 女性45%',
  avg_overtime_hours = 15.0,
  paid_leave_rate = 78.00,
  logo_url = '',       -- 画像は後から管理画面でアップロード
  cover_image_url = ''
WHERE id = '...';
```

### 注意点
- **`benefits`は改行(`\n`)区切り**。カンマ区切りだとUIで1つの長いタグとして表示される
- SQLで改行を入れるには `E'項目1\n項目2'` の形式を使う
- `approval_status` を `'approved'` にしないと求人が公開されない

---

## Phase 2: チーム・メンバー・診断データを増やす

### 手順
1. `teams` テーブルにINSERT
2. `team_invitations` テーブルに招待をINSERT（メンバーと1:1）
3. `team_members` テーブルにメンバーをINSERT（wv_vector, ci_vector付き）
4. `sessions` テーブルにWV診断セッションをINSERT
5. チームのベクトルをUPDATE（メンバーの平均）

### ベクトル設計のコツ

チームごとに「個性」を持たせる。同じチーム内のメンバーは近いベクトル、異なるチームは離れたベクトルにする。

**Work Values ベクトル（21次元）の意味:**
| Index | Key | 説明 |
|-------|-----|------|
| 0 | ability_utilization | 能力活用 |
| 1 | achievement | 達成 |
| 2 | activity | 活動性 |
| 3 | advancement | 昇進 |
| 4 | authority | 権威 |
| 5 | autonomy | 自律性 |
| 6 | company_policies | 会社方針 |
| 7 | compensation | 報酬 |
| 8 | co_workers | 同僚 |
| 9 | creativity | 創造性 |
| 10 | independence | 独立性 |
| 11 | moral_values | 倫理観 |
| 12 | recognition | 承認 |
| 13 | responsibility | 責任 |
| 14 | security | 安定 |
| 15 | social_service | 社会貢献 |
| 16 | social_status | 社会的地位 |
| 17 | supervision_hr | 上司の人間性 |
| 18 | supervision_technical | 上司の技術力 |
| 19 | variety | 多様性 |
| 20 | working_conditions | 労働条件 |

**チーム個性の例:**
- エンジニア: autonomy(5), creativity(9), ability_utilization(0) が高い
- デザイン: creativity(9), social_service(15), co_workers(8) が高い
- ビジネス: achievement(1), advancement(3), recognition(12), compensation(7) が高い
- カスタマーサクセス: co_workers(8), social_service(15), moral_values(11) が高い

**Career Interest ベクトル（20次元）:**
20のBasic Interest カテゴリのスコア。RIASEC（現実的・研究的・芸術的・社会的・企業的・慣習的）に対応。

### 診断データについて
- **responsesテーブルは不要**。アダプティブ一対比較の回答データは計算にのみ使われ、結果はresultsとベクトルに保存される
- seedには `sessions`（メタ情報）と `team_members.wv_vector` / `ci_vector` だけ入れればよい
- resultsテーブルは候補者ユーザーの場合のみ必要（レポート表示等で使う）

### 注意点
- `team_invitations` と `team_members` は1:1対応が必須（invitation_idにUNIQUE制約）
- `sessions` の `user_id` と `team_member_id` は排他（どちらか一方のみ設定）
- チームメンバーの場合: `user_id = NULL`, `team_member_id = メンバーID`
- `purpose` は `'team'`（チーム診断）を設定

---

## Phase 3: 求人を増やす（最重要）

### 手順
1. `job_postings` テーブルにINSERT（基本情報）
2. UPDATEで `content_blocks`（カスタムモード）と `thumbnail_urls` を設定

### 公開バリデーション（status='open'にするための条件）

```
ValidatePublish:
  ✅ title（必須）
  ✅ job_category（必須）
  ✅ employment_type（必須）
  ✅ description（必須）
  ✅ required_qualifications（必須）
  ✅ work_location（必須）
  ✅ work_location_change_scope（必須）
  ✅ job_description_change_scope（必須）
  ✅ contract_type（必須）
  ✅ work_hours（必須）
  ✅ holidays（必須）
  ✅ salary_min または salary_detail（必須）
  ✅ insurance（必須）
  ✅ smoking_policy（必須）
  ✅ selection_process（必須）
  ✅ thumbnail_urls: 3枚以上5枚以下
  ✅ content_blocks: テキストセクション3つ以上、各300文字以上
```

### ⚠️ 年収（salary_min / salary_max）

**万円単位で保存する。** フロントは `${salary_min}〜${salary_max}万円` と表示する。

| DB値 | 表示 |
|------|------|
| 600 | 600万円 |
| 1000 | 1000万円 |
| ~~6000000~~ | ~~6000000万円（間違い）~~ |

### ⚠️ 福利厚生（benefits）

企業プロフィールと同じく**改行区切り**。

```sql
-- ✅ 正しい
E'リモートワーク手当月3万円\n書籍購入費全額補助\n副業OK'

-- ❌ 間違い（1つの長いタグになる）
'リモートワーク手当月3万円、書籍購入費全額補助、副業OK'
```

### ⚠️ サムネイル（thumbnail_urls）

- 公開には**3枚以上**必要
- JSONBで `[{"url":"...","filename":"..."},...]` 形式
- seedでは `backend/scripts/seed-assets/placeholder.svg` を使用
- `make seed` 実行時に `uploads/job-images/` に自動コピーされる

```sql
thumbnail_urls = '[
  {"url":"/api/uploads/job-images/seed_placeholder_1.svg","filename":"placeholder1.svg"},
  {"url":"/api/uploads/job-images/seed_placeholder_2.svg","filename":"placeholder2.svg"},
  {"url":"/api/uploads/job-images/seed_placeholder_3.svg","filename":"placeholder3.svg"}
]'::jsonb
```

### ⚠️ UUID

- フロントのルーティング正規表現は `[0-9a-f-]`（小文字のみ）
- seedのUUIDに大文字を使うとURL直接アクセスでルーティングが失敗する
- PostgreSQLは大文字で入れても小文字で保存するが、念のためseedでは小文字を使う

---

## Phase 3.1: カスタムモード求人の作り方

カスタムモードは `content_blocks` JSONBフィールドで求人の本文セクションを自由に構成する機能。

### ContentBlock の構造

```typescript
interface ContentBlock {
  id: string;          // UUID（gen_random_uuid()で生成）
  type: "preset" | "custom" | "photo";
  key: string;         // presetの場合: "description", "appeal_points" 等。customの場合: ""
  title: string;       // セクション見出し
  body: string;        // 本文（300文字以上推奨）
  icon?: string;       // アイコン名（下記参照）
  color?: string;      // アクセントカラー（hex）
  width?: string;      // "100%" | "60" | "50" | "40"
  group_id?: string;   // ⚠️ 横並びペアのグループID
  images?: BlockImage[]; // photoタイプの場合
}
```

### ⚠️ 横並びレイアウト（group_id）

**`width` だけでは横並びにならない。** 同じ `group_id` を持つ連続する2ブロックがペアとして横に並ぶ。

```sql
-- ✅ 正しい（横並びになる）
jsonb_build_object('width', '60', 'group_id', 'same-uuid-here', ...),
jsonb_build_object('width', '40', 'group_id', 'same-uuid-here', ...),

-- ❌ 間違い（縦に並ぶ）
jsonb_build_object('width', '60%', ...),  -- group_idなし
jsonb_build_object('width', '40%', ...),  -- group_idなし
```

**幅の合計が100以下になること。** 60+40, 50+50 が基本。

**SQLでのgroup_id生成:**
```sql
UPDATE job_postings jp SET
  content_blocks = jsonb_build_array(
    jsonb_build_object(..., 'width', '60', 'group_id', g.g1),
    jsonb_build_object(..., 'width', '40', 'group_id', g.g1),
    jsonb_build_object(..., 'width', '50', 'group_id', g.g2),
    jsonb_build_object(..., 'width', '50', 'group_id', g.g2)
  )
FROM (SELECT gen_random_uuid()::text AS g1, gen_random_uuid()::text AS g2) g
WHERE ...;
```

### 利用可能なアイコン

| name | ラベル |
|------|--------|
| BriefcaseBusiness | ビジネス |
| Sparkles | キラキラ |
| AlertTriangle | 注意 |
| Users | チーム |
| Star | スター |
| BookOpen | 本 |
| ClipboardList | リスト |
| UserCheck | 人材 |
| Rocket | ロケット |
| Target | ターゲット |
| Heart | ハート |
| Lightbulb | アイデア |
| Code | コード |
| Globe | グローブ |
| TrendingUp | 成長 |
| Megaphone | 広報 |

### プリセットキーのデフォルトアイコン・色

| key | デフォルトアイコン | デフォルト色 |
|-----|-------------------|-------------|
| description | BriefcaseBusiness | （テーマ色） |
| appeal_points | Sparkles | （テーマ色） |
| challenges | AlertTriangle | #E0944A |
| team_description | Users | （テーマ色） |
| skills_gained | Star | （テーマ色） |

### カラーパレット

| 名前 | Hex |
|------|-----|
| フォレスト | #3D8B6E |
| アンバー | #E0944A |
| コーラル | #D4635A |
| パープル | #9b59b6 |
| ブルー | #3498db |
| ゴールド | #f39c12 |
| エメラルド | #2ecc71 |
| ティール | #1abc9c |
| ネイビー | #2c3e50 |
| ローズ | #e84393 |
| インディゴ | #6366f1 |
| スカイ | #0ea5e9 |

### テンプレート

`template` フィールドに設定。カスタムモードでは以下のいずれか:
- `standard` — 緑系グラデーション、温かみのあるデザイン
- `modern` — ダーク系、クール
- `minimal` — 白ベース、シンプル

### 推奨レイアウト構成

```
[仕事内容]           — 100%, preset, BriefcaseBusiness
[魅力 60%][チーム 40%] — group pair
[チャレンジ]          — 100%, preset, AlertTriangle, #E0944A
[技術スタック 50%][スキル 50%] — group pair, custom + preset
[選考プロセス]        — 100%, custom, ClipboardList
```

---

## Phase 4: 候補者ユーザーを増やす

### 手順
1. `users` テーブルにINSERT
2. `experiences`, `educations` テーブルに職歴・学歴
3. `skills`, `user_skills` テーブルにスキル
4. `sessions` + `results` テーブルにWV診断データ
5. `career_sessions` + `career_results` + `career_riasec_results` にCI診断データ
6. `users.wv_vector`, `users.ci_vector` をUPDATE

### resultsテーブル（21行/セッション）

```sql
INSERT INTO results (session_id, need_id, mu, se, display_score, rank) VALUES
  ('session-uuid', 1, 2.1, 0.35, 89.1, 1),  -- need_id 1-21
  ...;
```

- `mu`: Bradley-Terryのμ値（-3〜+3程度）
- `se`: 標準誤差（0.25〜0.40程度）
- `display_score`: `100 / (1 + exp(-mu))` で計算
- `rank`: display_scoreの降順

### career_results テーブル（20行/セッション）

```sql
INSERT INTO career_results (session_id, basic_interest_id, score, rank) VALUES
  ('session-uuid', 'A1', 4.2, 2),  -- A1-A3, C1-C3, E1-E3, I1-I4, R1-R3, S1-S4
  ...;
```

### career_riasec_results テーブル（6行/セッション）

```sql
INSERT INTO career_riasec_results (session_id, riasec_type, score, rank) VALUES
  ('session-uuid', 'R', 3.2, 3),
  ('session-uuid', 'I', 4.0, 1),
  ('session-uuid', 'A', 3.8, 2),
  ('session-uuid', 'S', 2.3, 6),
  ('session-uuid', 'E', 3.1, 4),
  ('session-uuid', 'C', 2.5, 5);
```

### 注意点
- `users.line_id` はUNIQUE。seedユーザーには `line_seed_001` 等のダミー値を使う
- `users.username` もUNIQUE。実在しそうなユーザー名を付ける
- `wv_vector` は results の mu 値と一致させる（21次元、need_id順）
- `ci_vector` は career_results の score と一致させる（20次元、basic_interest_id順）
- マッチングはベクトルのコサイン類似度で行われるので、候補者ベクトルの方向がチームベクトルと近いほどマッチスコアが高くなる

---

## Phase 5: 確認・スクリーンショット

Playwrightでスクリーンショットを撮って表示確認できる。

```bash
# 公開求人詳細ページ（未ログインでもアクセス可）
NODE_PATH=/Users/akiyama/node_modules node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://localhost:5173/jobs/{job-uuid}', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/job_preview.png', fullPage: true });
  await browser.close();
})();
"
```

### 注意点
- `--ignore-https-errors` が必要（ローカルのSSL証明書）
- UUIDは**小文字**で指定する（フロントのルーティングが小文字のみマッチ）
- 企業管理画面はcookie認証が必要なのでPlaywrightからは見れない
- 公開求人一覧(`/jobs`)、公開求人詳細(`/jobs/{uuid}`)は未認証でアクセス可

---

## コマンド

```bash
# seedデータ投入（画像コピー + SQL実行）
cd backend && make seed

# DB完全リセット（全テーブル削除 → マイグレーション → seed）
cd backend && make reset-db
```

---

## seed.sql の構成

```
1. 管理者ユーザー
2. 候補者ユーザー（プロフィール・職歴・学歴・スキル）
3. WV診断データ（候補者）
4. CI診断データ（候補者）
5. WV診断データ（候補者2）
6. 企業・チーム・企業ユーザー
7. inselfy社 チーム・メンバー・診断データ
8. 求人（inselfy社）
9. 求人の content_blocks・thumbnail_urls 設定
```

新しい企業・求人・ユーザーを追加する場合はセクション番号に合わせてブロックを追加する。
`ON CONFLICT DO NOTHING` を付けることで、繰り返し実行しても重複エラーにならない。
