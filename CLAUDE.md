# infonnect

## プロジェクト概要
- 種類: Webアプリケーション
- 説明: (TODO: アプリの目的・概要を記載)

## 技術スタック
- フロントエンド: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4
- バックエンド: Go
- データベース: PostgreSQL

## 開発ルール

### マイグレーション
- dirty 状態の修復には `force <現在適用済みのバージョン>` を使い、その後 `up` で新しいマイグレーションだけ適用する
- **`down -all` → `up` は絶対にやらない**（全テーブルが再作成されデータが消える）
- カラム追加のような非破壊的変更は `ALTER TABLE ADD COLUMN` だけで済むので、既存データに影響しない

## ディレクトリ構成
- (TODO: プロジェクト構成が決まったら記載)

## 参考プロジェクト
- サンプルプロジェクト: `~/practice/yuki/immortal-architecture-deploy`
- このプロジェクトはサンプルプロジェクトを参考に Next.js で構築する。サンプルの `frontend/src/app/` レイアウト・Tailwind 設定・コンポーネントスタイルをベースにし、必要に応じて簡略化する。

---

# 職務経歴書の処理ワークフロー

「未処理の職務経歴書を処理して」等と依頼されたら、以下の手順で処理する。
APIのベースURLはデフォルトで `http://localhost:5173` を使用する（Viteプロキシ経由）。

**認証:** admin APIには `X-Admin-Key` ヘッダーが必要。環境変数 `ADMIN_API_KEY` の値を使用する。
この値は管理画面（/admin/admins）で管理者ごとに発行される個人用APIトークン（`admin_...`形式）。
承認（approve）やプロフィール直接更新はブラウザのcookie認証も必要なため、Claude Codeからは実行できない。

## 手順

### 1. 未処理の職務経歴書一覧を取得
```
GET /api/admin/resumes?status=pending
```
レスポンスの `uploads` 配列から処理対象を確認し、ユーザーに一覧を表示する。

### 2. PDFをダウンロードして読み取る
```
GET /api/admin/resumes/:resumeId/download
```
Bashツールでcurlを使ってPDFを `/tmp/` にダウンロードし、Readツールで内容を読み取る。

### 3. PDFの内容からプロフィールデータを構築

PDFから情報を抽出し、以下のスキーマに従って JSON を構築する。下書き保存時にバリデーションが走るので、**必須フィールドを落とすと 400 で弾かれる**。

#### 必須ルール（承認時バリデーションと同一）

- `experiences[]` の各要素:
  - `company_name`（必須、空文字不可）
  - `title`（必須、空文字不可）
  - `start_year`（必須、1950〜来年）、`start_month`（必須、1〜12）
    - 代わりに `start_date: "YYYY-MM"` または `"YYYY-MM-DD"` でも可（サーバ側で分解される）
  - `is_current: true` の場合は `end_year`/`end_month` を **null または省略**
  - `is_current: false`（退職済み）の場合は `end_year`/`end_month` が **必須**
  - `end_year`/`end_month` の代わりに `end_date: "YYYY-MM"` も可
  - 終了日が start より前だとエラー
- `educations[]` の各要素:
  - `school`（必須、空文字不可）
  - `degree` は任意（学部・学科名などを入れる）
  - `start_year` / `end_year` は任意（null 可）
- `skill_names[]`:
  - 各要素は空文字不可、100文字以下、最大50件
- 長さ制限: `headline` 255、`about` 2000、`location` 100、`industry` 100、`url` 500
- `experiences` は最大50件、`educations` は最大20件

#### JSON サンプル

```json
{
  "headline": "バックエンドエンジニア",
  "about": "Go と PostgreSQL を用いた API 開発に10年従事...",
  "experiences": [
    {
      "company_name": "株式会社Acme",
      "title": "シニアエンジニア",
      "start_year": 2020,
      "start_month": 4,
      "end_year": null,
      "end_month": null,
      "is_current": true,
      "description": "2020年4月に入社し、決済基盤の設計・実装を主導。..."
    },
    {
      "company_name": "前職株式会社",
      "title": "エンジニア",
      "start_date": "2015-04",
      "end_date": "2020-03",
      "is_current": false,
      "description": "受託開発チームで..."
    }
  ],
  "educations": [
    {
      "school": "東京大学",
      "degree": "工学部情報工学科",
      "start_year": 2011,
      "end_year": 2015
    }
  ],
  "skill_names": ["Go", "PostgreSQL", "Docker"]
}
```

**重要:** 業務内容(description)は箇条書きではなく、自然な文章で記述すること。

### 4. 下書きとして保存

#### 4-1. JSON をファイルに書き出す

手順3で構築した JSON を **Write ツール** で `/tmp/resume_draft_{resumeId}.json` に書き出す。

**Bash の heredoc (`cat <<EOF > ...`) は使わないこと。** `"` やバックスラッシュのエスケープで壊れやすく、JSON 構文エラーの原因になる。Write ツールならそのまま書ける。

#### 4-2. curl で送信する

```bash
curl -s --fail-with-body -X PUT \
  -H "X-Admin-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/resume_draft_{resumeId}.json \
  http://localhost:5173/api/admin/resumes/{resumeId}/draft
```

**`--fail-with-body` を必ず付けること。** これにより 4xx/5xx のとき curl が非ゼロで終了しつつ、レスポンス body（エラーメッセージ）は stdout に表示されるため、エラーを確実に検知できる。

このAPIは下書き保存時にスキーマをパース・バリデーションし、OKなら「確認中(reviewing)」に自動変更する。

#### 4-3. エラー時の対応

curl が非ゼロで終了したら、**必ずレスポンス body を読む**。`{"code":"BAD_REQUEST","message":"..."}` の形式で、どのフィールドが問題かが具体的に示される。

**401 Unauthorized** が返った場合は JSON の問題ではなく `ADMIN_API_KEY` 環境変数が未設定・期限切れ。`echo $ADMIN_API_KEY` で確認する。

以下のエラーパターン別に対応する:

- **`experience[N]: start_year is required`** / **`start_month is required`**
  - PDF をもう一度確認し、該当職歴の入社年月を再抽出する
  - 見つからない場合は代わりに `start_date: "YYYY-MM"` 形式で入れてもよい

- **`experience[N]: end_year and end_month are required when is_current is false`** ⚠️ **要注意**
  - **まず「この職歴は本当に退職済みか」を PDF で再確認する**
  - 現職なら `"is_current": true` にし、`end_year`/`end_month` は `null` にする（← これが正解であることが多い）
  - 退職済みと確信できる場合のみ、PDF から退職年月を抽出して補完する
  - **決して「とりあえず適当な終了日を入れる」修正をしない**

- **`experience[N]: end_year/end_month must be null when is_current is true`**
  - 現職フラグが true なのに終了日が入っている。`end_year` / `end_month` を `null` にする

- **`education[N]: school is required`**
  - 学校名のフィールド名が違う可能性。`school` に学校名を入れる（`name` や `university` ではない）

- **`skill[N]: name is required`**
  - skill_names 配列に空文字列 `""` が混じっている。フィルタして除去する

- **`json: unknown field "xxx"`**
  - フィールド名のタイポ。正しいフィールド名（手順3のサンプル JSON を参照）に直す

- **`json: cannot unmarshal ... into ... int16`**
  - 数値フィールドに文字列を入れている。`"2020"` ではなく `2020` で入れる

**同じエラーが 2 回連続で出たら、機械的に修正を繰り返さず、PDF を読み直して抽出を根本から見直す。** 特に日付・期間表記は「2020年〜現在」「2018〜2020」のような省略表記になっていることがあるので注意。

#### 4-4. 送信前セルフチェック (任意)

エラーを減らすため、curl 実行前に以下を確認するとよい:

- [ ] `experiences` 全件で `company_name` / `title` / `start_year` / `start_month` が埋まっているか
- [ ] 現職の職歴は `is_current: true` かつ `end_year`/`end_month` が `null` か
- [ ] 退職済みの職歴は `is_current: false` かつ `end_year`/`end_month` に値があるか
- [ ] `educations` 全件で `school` が埋まっているか
- [ ] `skill_names` に空文字列が混ざっていないか

### 5. 確認用リンクを表示
処理完了後、管理者に下書き確認用のURLを表示する:
```
確認してください: http://localhost:5173/admin/resumes/{resumeId}/draft
```
管理者がこのページで内容を確認・編集し、「承認」ボタンを押す。2人以上の管理者が承認するとプロフィールに自動反映される。

---

# 求人票PDF自動入力ワークフロー

「未処理の求人票PDFを処理して」等と依頼されたら、以下の手順で処理する。
APIのベースURLはデフォルトで `http://localhost:5173` を使用する（Viteプロキシ経由）。
管理画面: http://localhost:5173/admin/job-pdfs

**認証:** admin APIには `X-Admin-Key` ヘッダーが必要。環境変数 `ADMIN_API_KEY` の値を使用する。
この値は管理画面（/admin/admins）で管理者ごとに発行される個人用APIトークン（`admin_...`形式）。

## 手順

### 1. 未処理の求人票PDF一覧を取得
```bash
curl -s -H "X-Admin-Key: $ADMIN_API_KEY" http://localhost:5173/api/admin/job-pdfs?status=pending
```
レスポンスの `uploads` 配列から処理対象を確認し、ユーザーに一覧を表示する。
各uploadには `id`, `company_name`, `job_posting_id`, `job_title`, `original_filename`, `photo_urls`, `status` が含まれる。
同じ `job_posting_id` を持つ複数のPDF（求人票＋ブリーフィング資料など）は1つの求人としてまとめて処理する。

### 2. PDFをダウンロードして読み取る
同じ `job_posting_id` に属する全PDFをダウンロードして読み取る。
```bash
curl -s -H "X-Admin-Key: $ADMIN_API_KEY" http://localhost:5173/api/admin/job-pdfs/{uploadId}/download -o /tmp/job_pdf_{uploadId}.pdf
```
Readツールで `/tmp/job_pdf_{uploadId}.pdf` の内容を読み取る。

### 3. 写真を確認する
`photo_urls` に含まれる写真をReadツールで読み取り、各画像の内容を把握する。
写真はローカルファイルとして `backend/uploads/job-images/` に保存されているので、パスを変換して直接読む。
例: `/api/uploads/job-images/xxx.png` → `backend/uploads/job-images/xxx.png`

各写真について以下を記録する:
- 画像の内容（ロゴ、人物、オフィス風景、集合写真など）
- 元画像の大まかな縦横比（横長バナー、正方形寄り、縦長など）
- トリミング耐性（文字やロゴ → クロップ不可 / 人物中心 → クロップ可 / 風景 → クロップ可）

### 4. プロンプトを取得する
同グループのいずれか1件からプロンプトを取得する（プロンプトは同一）。
```bash
curl -s -H "X-Admin-Key: $ADMIN_API_KEY" http://localhost:5173/api/admin/job-pdfs/{uploadId}/prompt
```
レスポンスの `prompt` フィールドにデータ構築用のプロンプトが含まれる。
このプロンプトには、抽出すべきフィールド一覧、コンテンツブロックの設計ルール、写真のレイアウトルールが記載されている。
写真URL・企業名等のメタデータもプロンプトに埋め込まれている。

### 5. プロンプトに従いPDFの内容から求人データを構築
手順4で取得したプロンプトの指示に従い、全PDFの内容を統合してJSONを生成する。

**写真のアスペクト比は、手順3の確認結果とレイアウト位置に基づいて判断する:**
- 文字・ロゴを含む画像 → `"free"`（クロップすると情報が欠落するため）
- フル幅ブロック → `"16:9"` が映えるが、元画像が極端に横長/縦長なら `"free"`
- 60%テキスト + 40%写真の横並び → `"3:4"` や `"1:1"` で縦の存在感を出す
- 50%+50%の写真ペア → 同じアスペクト比に揃えると綺麗（`"4:3"` 等）
- 判断に迷ったら `"free"` を選ぶ（クロップで情報が失われるリスクを回避）

### 6. 下書きとして保存（求人単位）
```bash
curl -s -X PUT \
  -H "X-Admin-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"...", "description":"...", ...}' \
  http://localhost:5173/api/admin/job-postings/{jobPostingId}/job-pdf-draft
```
手順4で構築したJSONをリクエストボディとして送信する。
**求人(job_posting_id)単位で1回だけリクエストする。** 同じ求人に紐づく全アップロードのステータスが自動的に「確認中(reviewing)」に変更される。

### 7. 完了報告
処理した件数をユーザーに報告する。
企業側は求人編集ページで「フォームに反映」ボタンを押して下書きを取り込める。

---

# AIレポート生成ワークフロー（Work Values）

以下のいずれかの依頼でこのワークフローを実行する:
- 「未生成のレポートを処理して」「レポートを生成して」→ WV・CI両方の未生成全件を処理
- 「aahoのレポートを生成して」→ 指定ユーザーの未生成セッションだけ処理
- 「セッション xxx のレポートを生成して」→ 指定セッションだけ処理

AIレポートはバックエンドでの自動生成を行わず、Claude Codeがバッチ生成する。
管理画面: http://localhost:3000/admin/reports

**認証:** admin APIには `X-Admin-Key` ヘッダーが必要。環境変数 `ADMIN_API_KEY` の値を使用する。

## 手順

### 1. 未生成のセッション一覧を取得
```
GET /api/admin/reports/pending
```
レスポンスの `sessions` 配列から未生成件数を確認し、ユーザーに一覧を表示する。

**ユーザー名やセッションIDが指定された場合:** 一覧から該当するものだけをフィルタして処理対象とする。該当がなければその旨を報告して終了。

### 2. 各セッションを順番に処理する

対象セッションごとに以下を繰り返す（1件ずつ直列で処理）:

#### 2-1. プロンプトを取得
```
GET /api/admin/sessions/{sessionId}/prompt
```
レスポンスの `prompt` フィールドに、診断結果データが埋め込まれたレポート生成用プロンプトが返される。
バックエンドがmu/SEから統計的有意性を判定し、プロンプトテンプレート（`prompts/work-values-report-prompt.md`）にデータを埋め込んで返す。

#### 2-2. プロンプトに従いレポートを生成する
取得したプロンプトの指示に従い、マークダウン形式のレポートを生成する。

#### 2-3. レポートを保存
```
PUT /api/admin/sessions/{sessionId}/ai-report
Content-Type: application/json

{ "content": "生成したマークダウンレポート" }
```

### 3. 完了報告
処理した件数をユーザーに報告する。

---

# AIレポート生成ワークフロー（Career Interest）

Work Valuesと同じ流れ。APIエンドポイントのみ異なる。

**認証:** 同上（`X-Admin-Key` ヘッダー）。

## 手順

### 1. 未生成のセッション一覧を取得
```
GET /api/admin/ci-reports/pending
```

### 2. 各セッションを順番に処理する

#### 2-1. プロンプトを取得
```
GET /api/admin/ci-sessions/{sessionId}/prompt
```
レスポンスの `prompt` フィールドに、RIASECスコア・基本興味スコア・個別回答が埋め込まれたプロンプトが返される。

#### 2-2. プロンプトに従いレポートを生成する
取得したプロンプトの指示に従い、マークダウン形式のレポートを生成する。

#### 2-3. レポートを保存
```
PUT /api/admin/ci-sessions/{sessionId}/ai-report
Content-Type: application/json

{ "content": "生成したマークダウンレポート" }
```

### 3. 完了報告
処理した件数をユーザーに報告する。

---

# 統合レポート生成ワークフロー

「未生成の統合レポートを処理して」等と依頼されたら、以下の手順で処理する。
統合レポートもAIレポートと同様に、Claude Codeがバッチ生成する。
管理画面: http://localhost:5173/admin/reports

**認証:** 他のワークフローと同じく `X-Admin-Key` ヘッダーに環境変数 `ADMIN_API_KEY` の値を使用する。

## 手順

### 1. 未生成のユーザー一覧を取得
```
GET /api/admin/reports/integrated/pending
```
レスポンスの `users` 配列から未生成件数を確認し、ユーザーに一覧を表示する。
各ユーザーには `user_id`, `display_name`, `username` が含まれる。

### 2. プロンプトを取得
```
GET /api/admin/users/{userId}/integrated-report/prompt
```
レスポンスの `prompt` フィールドにデータ埋め込み済みのプロンプトが含まれる。
プロンプトにはプロフィール（職歴・スキル・学歴）、Work Values診断結果、Career Interest診断結果が統合されている。

### 3. プロンプトに従いレポートを生成する
取得したプロンプトの指示に従い、マークダウン形式のレポートを生成する。

### 4. レポートを保存
```
PUT /api/admin/users/{userId}/integrated-report
Content-Type: application/json

{ "content": "生成したマークダウンレポート" }
```

### 5. 完了報告
処理した件数をユーザーに報告する。

---

# Work Values 診断システム — 実装仕様書（Phase 1–2）

## 1. 概要

TWA（Theory of Work Adjustment）に基づき、21の Work Needs を一対比較で測定し、Bradley-Terry モデルでスコア化するシステム。最終的に O*NET の ORP データと照合して職業マッチングを行う（Phase 3–4 は別途）。

**全体フロー:** アダプティブ一対比較（50–70問） → 整合性チェック → BT モデルでスコア推定 → 6 Values 集約 → O*NET マッチング

---

## 2. Phase 1：質問設計と回答収集

### 2.1 21 Work Needs

| # | ID | 説明文 |
|---|-----|--------|
| 1 | ability_utilization | 自分が持っているスキルや得意なことを存分に活かして働ける |
| 2 | achievement | 目標をやり遂げたとき、大きな達成感を味わえる |
| 3 | activity | 手が空くことがなく、常にやるべき仕事に取り組んでいられる |
| 4 | advancement | 努力や実力に応じて、キャリアアップしていける道がある |
| 5 | authority | メンバーに方向性を示し、チームを率いる立場で働ける |
| 6 | autonomy | 上司に細かく管理されず、自分で計画を立てて仕事を進められる |
| 7 | company_policies | 会社の制度や評価基準が明確で、公正に運用されている |
| 8 | compensation | 自分の仕事や責任に見合った、納得できる給与・報酬が得られる |
| 9 | co_workers | 気が合い信頼できる仲間と、協力しながら働ける |
| 10 | creativity | 既存のやり方にとらわれず、自分のアイデアや工夫を試せる |
| 11 | independence | 他の人に頼らず、自分の力で仕事をやり遂げられる |
| 12 | moral_values | 自分の倫理観や価値観に反することをしなくてよい |
| 13 | recognition | 自分の成果や頑張りが、周囲からきちんと評価される |
| 14 | responsibility | 重要な仕事を任され、自分の裁量で判断・意思決定ができる |
| 15 | security | 景気や会社の状況に左右されず、長く安心して働き続けられる |
| 16 | social_service | 自分の仕事を通じて、誰かの助けになったり社会に貢献できる |
| 17 | social_status | 職業や立場を通じて、社会的に認められ尊敬される |
| 18 | supervision_hr | 困ったときや理不尽な状況で、上司が自分の味方になってくれる |
| 19 | supervision_technical | 上司が自分の成長を考え、的確なアドバイスや指導をしてくれる |
| 20 | variety | 同じ作業の繰り返しではなく、日々違う仕事や課題に取り組める |
| 21 | working_conditions | 勤務時間や職場環境など、快適で働きやすい条件が整っている |

### 2.2 アダプティブ一対比較

- 全ペア数は ₂₁C₂ = 210 だが、アダプティブ方式により **50〜70問** で打ち切る
- フロントエンド側で Bradley-Terry モデルをリアルタイム推定し、SE（標準誤差）の収束を監視して次のペアを選択
- 各ペアで「どちらがより重要か」を二択で回答（同等なし）

### 2.3 回答データ構造

```json
{
  "respondent_id": "uuid",
  "responses": [
    { "need_a": "creativity", "need_b": "security", "winner": "creativity" },
    ...
  ]
}
```

`responses` は50〜70件。`winner` は `need_a` か `need_b` のいずれか。

### 2.4 比較行列

回答から 21×21 の行列 Y を構築。`Y[i][j]=1` はニーズ i が j に勝利。未比較ペアは空欄。

---

## 3. Phase 2：スコアリング

### 3.1 整合性チェック

循環三つ組（A>B, B>C, C>A）の数 d を計測。

- 全三つ組数: ₂₁C₃ = 1,330
- 最大循環数 d_max: `(n³-n)/24 = 385`（n=21）
- 整合性係数: `ζ = 1 - d/d_max`

| ζ | 判定 | アクション |
|---|------|-----------|
| ≥0.75 | 高い | 正常処理 |
| 0.50–0.74 | 中程度 | 警告付き続行 |
| 0.30–0.49 | 低い | 強い警告付き |
| <0.30 | 非常に低い | 無効、再回答推奨 |

### 3.2 Bradley-Terry モデル

各ニーズ i の強度 μᵢ（実数）を推定する。

**確率モデル:**

```
P(i>j) = 1 / (1 + exp(-(μᵢ - μⱼ)))
```

**識別制約:** `Σμᵢ = 0`（平均ゼロ）

**目的関数（正則化付き）:**

```
ℓ(μ) = Σ_{i<j} [Y[i][j]·log P(i>j) + Y[j][i]·log(1-P(i>j))] - (1/2σ²)·Σμᵢ²
```

L2正則化（σ²=3.0）により全勝・全敗時の発散を防止。σ²はパイロットデータで要調整。

**勾配:**

```
∂ℓ/∂μᵢ = Σ_{j≠i} [Y[i][j] - P(i>j)] - μᵢ/σ²
```

**最適化:** L-BFGS。初期値 μᵢ=0。収束条件: 勾配ノルム < 1e-6 or 最大1000反復。収束後に平均ゼロ制約を再適用（`μᵢ ← μᵢ - mean(μ)`）。

**エッジケース:**

| ケース | 対応 |
|--------|------|
| 全勝（20-0） | 正則化で μ≈+3〜+4 に収束 |
| 全敗（0-20） | 正則化で μ≈-3〜-4 に収束 |
| 低整合性回答 | 3.1で判定済み。警告付きで処理続行 |

### 3.3 display_score 変換

μᵢ をユーザー表示用 0–100 に変換:

```
display_score = 100 × 1/(1 + exp(-μᵢ))
```

| μ | score | 解釈 |
|---|-------|------|
| +3.0 | 95.3 | 非常に重視 |
| +2.0 | 88.1 | 強く重視 |
| +1.0 | 73.1 | やや重視 |
| 0.0 | 50.0 | 平均的 |
| -1.0 | 26.9 | あまり重視しない |
| -2.0 | 11.9 | 重視しない |
| -3.0 | 4.7 | ほとんど重視しない |

0/100 に到達しない。分化が低い人は全項目40–60付近に集中する。

### 3.4 Phase 2 最終出力

```json
{
  "respondent_id": "uuid",
  "consistency": {
    "circular_triads": 42,
    "max_circular_triads": 385,
    "consistency_coefficient": 0.891,
    "consistency_level": "high"
  },
  "needs": {
    "creativity": { "mu": 2.1, "display_score": 89.1, "rank": 1 },
    "autonomy": { "mu": 1.8, "display_score": 85.8, "rank": 2 },
    ...
    "social_status": { "mu": -1.7, "display_score": 15.4, "rank": 21 }
  }
}
```

---

## 4. 未決事項

| # | 項目 | 優先度 |
|---|------|--------|
| 1 | σ²=3.0 のパイロット検証 | 高 |
| 2 | 質問文の日英対応 | 中 |
| 3 | 集団基準パーセンタイルへの将来切替 | 低 |
