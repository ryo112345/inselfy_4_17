# 契約クリーンアップ（命名統一・ラッパー統一・enum 化）

`docs/frontend-generated-client-migration.md` 完了後の根本改善。
契約チェックループが両側（Go / TS）で閉じているので、.tsp 修正 → 再生成 →
両側のコンパイルエラー修正で機能ごとに安全に刻める。

**スコープ外（別議論）:** `GET /api/jobs` の二形レスポンス廃止（挙動変更）、
`@maxLength`/`@format` 追加。

## 再生成コマンド（毎ステップ共通）

```bash
cd api-schema && ./scripts/generate-openapi.sh && ./scripts/generate-ts.sh
cd ../backend && make oapi && go build ./... && go vet ./... && make test
cd ../frontend && npx tsc --noEmit && npm run build
```

## 検証方針

- presenter / controller が生成型（`openapi.ModelsXxx`）でレスポンスを作る機能は、
  再生成後のコンパイルエラー修正だけで安全（json タグは生成側で追従する）。
- **生成型を使っていない ad-hoc map 実装**（integrated-report の user-facing 5ルート、
  WV/CI の ai-report GET = admin コントローラ実装）は、スペック改名がコンパイルエラーに
  ならない。**手動でキーを改名し、サーバ起動 → curl 実測で検証必須。**
- admin 専用ルート（/api/admin/*）はスペック外。admin ページが読む JSON のキーは変えない。

## 1. 命名統一（snake_case → camelCase）

対象は以下の8ファイル。プロパティ名を lowerCamelCase に改名する（値は変えない）。
Go 側は生成フィールド名が概ね同一（`session_id` → `SessionId` / `sessionId` → `SessionId`）
のためコンパイルエラーが出ないことがある。**TS 側の tsc エラーを網羅の主検出手段とする。**

| # | 状態 | スペックファイル | 主なフィールド | 実装形態 |
|---|------|------------------|----------------|----------|
| N1 | [x] | models/work-values.tsp | user_id, need_a/b, question_number, initial_pairs, need_id, description_ja, display_score, value_id, session_id, created_at | presenter 生成型 |
| N2 | [x] | models/career-interest.tsp | user_id, question_number, item_code, basic_interest_id, skill_level, activity_type, text_ja, type_id, basic_scores, type_scores, session_id, created_at | presenter 生成型 |
| N3 | [x] | models/company-team.tsp | company_id, is_public, member_count, wv_completed, ci_completed, created_at, invite_token, wv_status, ci_status, is_ace, display_score, member_id, member_name, user_id, wv_scores, ci_scores, team_id, team_name, wn_scores, completed_count | presenter 生成型 |
| N4 | [x] | models/team-diagnose.tsp | member_id, member_name, team_name, company_name, user_id, wv_status, ci_status | presenter 生成型 |
| N5 | [x] | models/talent.tsp | company_name, user_id, avatar_url, profile_color, job_seeking_status, top_wv_labels, top_ci_labels, wv_similarity, ci_similarity, integrated_similarity, user_ids | presenter 生成型 |
| N6 | [x] | models/similar-users.tsp | company_name, is_current, user_id, avatar_url, profile_color, top_needs | presenter 生成型 |
| N7 | [x] | models/integrated-report.tsp | free_text, request_id, user_id, created_at, has_report | **ad-hoc map（admin コントローラ）→ 手動改名 + curl 検証** |
| N8 | [x] | models/common.tsp（AiReportResponse） | session_id, created_at, first_view | **ad-hoc map（admin コントローラ）→ 手動改名 + curl 検証** |

### 命名統一の無言破壊ポイント（2026-07-07 調査済み・要手動対応）

コンパイルエラーにならず実行時に壊れる箇所。改名時に必ず併修する:

- **バックエンド ad-hoc map（N7/N8）:**
  - `admin_report_controller.go` `GetReport`（WV ai-report。admin ルートと同メソッド共有だが
    admin UI は未使用なので改名可）
  - `admin_ci_report_controller.go` `GetReport`（CI ai-report。同上）
  - `admin_integrated_report_controller.go` の user-facing 5ハンドラ
    （CreateRequest / GetReportByUser / GetRequestStatus / GetReport / GetLatestRequest）
  - 同ファイルのリクエスト body struct `createIntegratedReportRequestBody` の
    `json:"free_text"` タグ（改名しないと Bind が空文字で素通りする）
  - **`ListPending` / `ListReports` / `SaveReport` / `GetSessionScores` の map はスペック外
    （admin 専用）なので触らない**（admin ページの手書き interface が snake_case を期待）
- **フロントの型なし fetch 境界（N3）:** `companyFetch()` の `res.json()` を手書き
  snake_case interface で受けている3ページは tsc で検出されない → 手動改名:
  - `src/app/company/teams/page.tsx`（`member_count` 等）
  - `src/app/company/teams/[id]/page.tsx`（`display_score`, `wv_scores`, `ci_scores` 等）
  - `src/app/company/jobs/[jobId]/page.tsx`（`member_count`, `wv_scores` 等）
  - `src/app/companies/[id]/TeamScoresSection.tsx` の手書き `PublicTeamScore`
    （境界で tsc に掛かるが型定義自体は手動更新）
- **クエリパラメータは今回のスコープ外**（talent search の `job_seeking_status`/`job_type` や
  動的 `wv_*`/`ci_*` はバックエンドが `QueryParam()` を直読みしており、改名はスペックと
  実装の同時手修正になる。JSON フィールドの統一と切り離して据え置く）。

## 2. ラッパー統一（裸配列 → {items, total} / キー名統一）

一覧レスポンスは `{items: T[], total?}` に統一する。詳細オブジェクト内の
セマンティックな配列（TeamDetailResponse.members 等）は対象外。

| # | 状態 | 対象 | 変更 |
|---|------|------|------|
| W1 | [ ] | routes/scout-templates.tsp `listScoutTemplates` | 裸配列 → `ScoutTemplateListResponse {items}` |
| W2 | [ ] | routes/job-postings.tsp `listCompanyJobPostings` | 裸配列 → `JobPostingListResponse {items, total}` 再利用 |
| W3 | [ ] | models/talent.tsp `TalentListResponse` | `{users, total}` → `{items, total}` |
| W4 | [ ] | models/similar-users.tsp `SimilarUsersResponse` | `{users, total}` → `{items, total}`（null 許容は維持） |
| W5 | [ ] | models/company-team.tsp `TeamListResponse` / `PublicTeamScoresResponse` / `TeamScoresResponse` | `{teams}` / `{members}` → `{items}` |
| W6 | [ ] | models/interview.tsp 一覧2種 | `{interviews}` → `{items}` |

## 3. enum 化

値集合はバックエンド domain 定数＋DB 制約（migrations）で確認済み（2026-07-07 調査）。
共有される値集合は TypeSpec の named union（`union XxxStatus { ... }`）として models に定義し、
1箇所でしか使わないものは inline union でよい。Go 側は生成された named string type への
キャスト修正、goverter converter は enum 変換（または extend）で追従する。

| # | 状態 | フィールド | 値集合 | 根拠 |
|---|------|-----------|--------|------|
| E1 | [ ] | job-application `status`（response + update request） | `applied` `screening` `interview` `offer` `accepted` `rejected` `withdrawn` | domain/jobapplication/entity.go + DB CHECK |
| E2 | [ ] | scout / candidate-scout `status` | `draft` `sent` `opened` `replied` `interested` `declined` `expired` | domain/scout/entity.go + DB ENUM。FE 手書き union（scout/types.ts）と一致 → 生成型に置換 |
| E3 | [ ] | scout quality `level` | `good` `warning` `temporarily_restricted` `restricted` | domain/scout/entity.go QualityLevel |
| E4 | [ ] | work-values / career-interest セッション `status` | `in_progress` `completed` `expired` | 両 domain 定数 + DB CHECK |
| E5 | [ ] | article `status` | `draft` `published` | domain/article/entity.go + DB ENUM |
| E6 | [ ] | notification `type` | `scout_received` `scout_replied` `scout_interested` `scout_declined` `scout_expired` `credit_replenished` `quality_warning` | domain/notification/entity.go + DB ENUM |
| E7 | [ ] | company-auth `status` | `pending` `approved` `rejected` | domain/company/entity.go + DB ENUM |
| E8 | [ ] | interview: proposal `status` / slot `status` / interview `status` | proposal: `pending` `confirmed` `expired` `cancelled` ／ slot: `proposed` `selected` `rejected` ／ interview: `scheduled` `completed` `cancelled` `no_show` | domain コメント準拠（`expired`/`completed`/`no_show` は現状未出力だが文書化された将来値として含める）。FE 手書き union（interview/types.ts）と一致 → 生成型に置換 |
| E9 | [ ] | job-posting `status` | `draft` `open` | interactor が認識する2値のみ（DB は TEXT・未検証のパススルー） |
| E10 | [ ] | team member / team-diagnose `wv_status` `ci_status` | `pending` `completed` | コード上この2値のみ（update は `completed` のみ受理） |
| E11 | [ ] | career-interest 設問 `skill_level` | `entry` `mid` `advanced` | domain/careerinterest/items.go（コンパイル時定数） |

**enum 化しない（自由記述）:** `jobSeekingStatus` / `job_seeking_status` / `candidateSeekingStatus`
（長さ50制限のみの自由テキスト）、career-interest の `activity_type`（日本語カテゴリラベル）。

## 進め方

1ステップ = 「.tsp 修正 → 再生成 → 両側修正 → build/test/tsc → チェック更新 → コミット」。
コミットメッセージは `refactor(api): <step> — contract cleanup`。
