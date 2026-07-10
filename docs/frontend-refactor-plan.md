# フロントエンド改善 計画書

2026-07-07 時点の `frontend/src`（192ファイル）全体調査に基づくフロントエンド改善の実行計画。
**どのセッションから再開しても作業が完結するように書いてある。**
行数・行番号は調査時点のもの。着手時にズレていたら読み替える。

## 方針（前提）

- 1項目 = 1コミット。完了したらこの計画書のチェックを入れ、同じコミットに含める。
- 各項目の共通検証: `cd frontend && npm run typecheck && npm run lint && npm run test`
  ＋対象画面の手動確認（`npm run dev`）。
- **見た目・挙動が変わる項目（F6, F12〜F14 など）は一括適用せず、1画面ずつ適用して
  ユーザー確認を取ってから横展開する。**
- リファクタ系（F7〜F11 等）は挙動変更しない。途中で既存バグを見つけても直さず別途報告
  （F1〜F4 のバグ修正項目は除く）。
- Phase 内は並行可能だが、Phase B（共通基盤）は後続 Phase の前提なので先に終わらせる。

## 対象一覧と進捗

### Phase A: バグ・セキュリティ即修正（独立・先行可）

| # | 状態 | 項目 | 規模 | 種別 |
|---|------|------|------|------|
| F1 | [x] | bfcache リロード強制スクリプトの削除 | 小 | パフォーマンス |
| F2 | [x] | `dangerouslySetInnerHTML` のサニタイズ（DOMPurify 導入） | 小 | セキュリティ |
| F3 | [x] | 通信失敗の握りつぶし解消（コメント投稿ほか） | 中 | バグ |
| F4 | [x] | stale-response / 競合状態の解消（AbortController 導入） | 中 | バグ |

### Phase B: 共通基盤の構築（後続の前提）

| # | 状態 | 項目 | 規模 | 種別 |
|---|------|------|------|------|
| F5 | [x] | 共通UI部品の昇格・新設（Modal / Toast / ConfirmDialog） | 中 | 基盤 |
| F6 | [x] | `alert()` / `confirm()` 全廃（F5 依存） | 中 | UX |
| F7 | [x] | 共有アイコンの集約（`src/components/icons/`） | 中 | 重複排除 |
| F8 | [x] | 日付フォーマットの集約（`src/lib/date.ts`） | 小 | 重複排除 |
| F9 | [x] | API ボイラープレートの共通化（`run` / `unwrap`） | 中 | 重複排除 |
| F10 | [x] | テーマカラー・選択肢マスタ・ステータスマップの定数化 | 中 | 重複排除 |

### Phase C: 大型リファクタ

| # | 状態 | 項目 | 規模 | 種別 |
|---|------|------|------|------|
| F11 | [x] | 求人フォームの統合（`useJobForm` + `<JobPostingForm>`）（F7, F10 依存） | 大 | 分割・重複排除 |
| F20 | [x] | 巨大リストページの分割（talents / jobs / applications） | 大 | 分割 |

### Phase D: Next.js 機能の活用

| # | 状態 | 項目 | 規模 | 種別 |
|---|------|------|------|------|
| F12 | [x] | `loading.tsx` / `error.tsx` / `not-found.tsx` の追加 | 小 | UX |
| F13 | [x] | `next/image` への移行（全17ファイル） | 中 | パフォーマンス |
| F14 | [x] | 公開ページの SSR 化＋`generateMetadata` | 大 | SEO・パフォーマンス |
| F15 | [x] | 重量ライブラリの dynamic import（TipTap / react-easy-crop） | 小 | パフォーマンス |

### Phase E: データ層・型のクリーンアップ

| # | 状態 | 項目 | 規模 | 種別 |
|---|------|------|------|------|
| F16 | [x] | 未読 Context 3種の統一（SDK化・メモ化・サーバカウント） | 中 | 統一 |
| F17 | [x] | プロフィールページのウォーターフォール解消 | 中 | パフォーマンス |
| F18 | [x] | 型安全性クリーンアップ（`err: any` / `as any` / 二重キャスト） | 中 | 型安全 |
| F19 | [x] | AIレポート生成ステータスのポーリング | 小 | UX |

### Phase F: Phase E 実施中に見つかったリファクタ候補（未着手）

Phase E（2026-07-09）の作業中に発見したもの。詳細は「Phase F」セクション参照。
バックエンド側の2件（ルート登録の二重管理、displayName cookie 廃止）は
`docs/backend-refactor-backlog.md` の #8/#9 に切り出した。

| # | 状態 | 項目 | 規模 | 種別 |
|---|------|------|------|------|
| F21 | [x] | AIレポートセクション3実装の統合（useTypewriter・ポーリング込み） | 中 | 重複排除 |
| F22 | [x] | `isOwner = true` デフォルトの廃止 | 小 | 安全性 |
| F23 | [x] | サーバー用 SDK クライアントで cookie 転送を自動化 | 中 | 統一 |
| F24 | [x] | 401 インターセプタの /login リダイレクトをオプトアウト可能に | 小 | 安全性 |
| F25 | [x] | レポート存在チェックの軽量化（本文の二重取得解消） | 小 | パフォーマンス |
| F26 | [x] | biome 既存エラー・警告の解消 | 小 | 品質 |

---

## Phase A: バグ・セキュリティ即修正

### F1 bfcache リロード強制スクリプトの削除

**現状:** `src/app/layout.tsx:33-36` に `bfcache-reload` という `<Script>` があり、
`pageshow` の `persisted` / `back_forward` を検知して `location.reload()` する。
ブラウザの bfcache と App Router のクライアントナビゲーションを両方無効化しており、
「戻る/進む」のたびに全ページ再取得になっている。

**やること:**

1. なぜ入れたか経緯を `git log -S "bfcache-reload"` で確認する（認証状態や未読数の鮮度が
   目的だった可能性が高い）。
2. スクリプトを削除。
3. 削除で再発する問題（例: ログアウト後に戻ると古い画面が見える）があれば、全体リロードでは
   なく個別対応する: 対象データの再取得を `pageshow` で `router.refresh()` する、
   または該当 Context の `refresh()` を呼ぶ。
4. 手動確認: ログイン→ページ遷移→戻る/進む、ログアウト→戻る、で表示が破綻しないこと。

**コミット:** `fix(frontend): remove bfcache-busting reload script`

### F2 `dangerouslySetInnerHTML` のサニタイズ

**現状:** サニタイズなしでユーザー由来 HTML を注入している（`dompurify` 未導入・sanitize 実装ゼロを確認済み）:

- `features/articles/ArticleView.tsx:383,391` — 記事本文（RichEditor=TipTap 由来のユーザー入力）
- `app/work_values/[sessionId]/WorkValuesContent.tsx:928,934` ＋ `markdownToHtml`（965-987、エスケープなしの正規表現置換）
- `app/career_interest/[sessionId]/CareerInterestContent.tsx:884,890` — 同型
- `app/integrated-report/[requestId]/IntegratedReportContent.tsx:280,286` — 同型

**やること:**

1. `npm i dompurify`（v3 は型定義同梱。`isomorphic-dompurify` は SSR で注入する場合のみ検討）。
2. 注入直前に `DOMPurify.sanitize(html)` を通す共通ヘルパー `src/lib/sanitize.ts` を作り、上記4ファイルに適用。
3. `markdownToHtml`（3ファイルに重複）は `src/lib/` に1本化した上でサニタイズを通す。
4. バックエンド側で記事 body の保存時サニタイズがあるか確認し、なければ別途報告（フロント側の対応はいずれにせよ実施）。
5. 手動確認: 記事表示・各レポート表示が崩れないこと。`<img onerror=alert(1)>` 入り本文が無害化されること。

**コミット:** `fix(frontend): sanitize user-generated HTML with DOMPurify`

### F3 通信失敗の握りつぶし解消

**現状:** 失敗してもユーザーに何も表示されない箇所が多数:

- `app/post/[id]/PostDetail.tsx:97-98`, `features/timeline/CommentSection.tsx:58-59` —
  コメント投稿失敗が `catch { /* ignore */ }`。投稿できたと誤認し入力も失われる。
- `.catch(() => {})` / `.catch(() => setXxx([]))` でエラーと0件が区別できない:
  `app/articles/mine/MyArticles.tsx:70`、`app/profile/[username]/PostsTabs.tsx:39`、
  `SimilarUsersCard.tsx:31`、`AiReportCard.tsx:37`、`app/admin/reports/page.tsx:114-120`
  （未読 Context 系は F16 で対応するのでここでは触らない）。

**やること:**

1. コメント投稿: catch で `setError` してフォーム下にインライン表示。入力値は保持し再送可能にする。
2. リスト取得系: `error` state を追加し、「読み込みに失敗しました＋再読み込みボタン」を表示。
   空データ表示と区別する。
3. 表示部品は F5 の Toast ができていればそれを使ってよいが、依存させず素朴なインライン表示でも可。

**コミット:** `fix(frontend): surface fetch/post failures instead of swallowing them`

### F4 stale-response / 競合状態の解消

**現状:** コードベース全体で `AbortController` 使用ゼロ。以下で古いレスポンスが新しい state を上書きし得る:

- `app/company/talents/page.tsx:290-311` — 候補者切り替えの連打で、前の候補者の詳細
  （レーダーチャート・職歴）が選択中の候補者に表示される。`.catch` もなくエラー無表示。
- `app/jobs/page.tsx:271-280` — 検索デバウンス後のリクエストがキャンセルされず、
  フィルタ変更（reset 経路）は `fetchingRef` ガードも効かない。
- `app/jobs/page.tsx:299-308` — 無限スクロールで `jobs` が増えるたび全社のチームスコアを
  再取得（取得済み分も毎回）。
- `app/profile/[username]/PostsTabs.tsx:31-41` — `likedLoaded` が `userId` 変更でリセット
  されず、別プロフィールに前ユーザーのいいね一覧が残る。

**やること:**

1. 生成SDK（hey-api）は `signal` を渡せるので、`AbortController` を使った標準パターンを決める:
   effect 冒頭で `const ac = new AbortController()`、cleanup で `ac.abort()`、
   SDK 呼び出しに `signal: ac.signal`。abort 由来のエラーは無視。
2. talents 詳細・jobs 検索に適用。talents はエラー state も追加。
3. チームスコアは `teamScoresMap` に無い companyId だけ差分フェッチに変更。
4. PostsTabs は `userId` を依存に含めて state（`likedLoaded` / `likedPosts`）をリセット。
5. 手動確認: 候補者を高速切替して詳細が最後の選択と一致すること。

**コミット:** `fix(frontend): cancel stale requests and fix race conditions`

---

## Phase B: 共通基盤の構築

### F5 共通UI部品の昇格・新設

**現状:** `app/profile/[username]/Modal.tsx` に Escape 閉じ・スクロールロック・`role="dialog"`
対応済みの良い `Modal` / `Field` / `PrimaryButton` / `SecondaryButton` があるが、profile 配下に
閉じている。他所（`features/articles/ArticleForm.tsx`、`features/interview/components/InterviewDetailPanel.tsx`、
`features/work-values/ValuesFilterDrawer.tsx`、`app/company/teams/[id]/page.tsx`、
`app/company/jobs/{new,[jobId]}/page.tsx`）は `fixed inset-0` を手組みで再実装。
Toast / ConfirmDialog は存在しない。

**やること:**

1. `src/components/ui/` を新設し、`Modal` / `Field` / `PrimaryButton` / `SecondaryButton` を移動
   （profile 配下は re-export か import 差し替え）。
2. `Toast`（成功/失敗の通知。Context + `useToast()` フックで全画面から呼べるように。
   Provider は `app/layout.tsx` に追加）と `ConfirmDialog`（`confirm()` 代替。
   `const ok = await confirmDialog({title, message, destructive})` の Promise ベース）を新規実装。
3. 手組みオーバーレイ箇所を共通 `Modal` に置換（この時点では見た目を変えない）。

**コミット:** `refactor(frontend): promote shared UI components and add Toast/ConfirmDialog`

### F6 `alert()` / `confirm()` 全廃（F5 依存）

**現状:** 約15箇所でネイティブダイアログを使用:

- `app/company/jobs/[jobId]/page.tsx:769,823,880,888,1003,1019`（公開バリデーション失敗・保存/削除失敗・公開/非公開確認）
- `app/interviews/page.tsx:250,256`、`features/interview/components/InterviewDetailPanel.tsx:43,49`
- `app/company/scout/[scoutId]/page.tsx:54`、`app/company/scout/templates/page.tsx:33,39`
- `app/company/teams/[id]/page.tsx:139`
- `app/profile/[username]/ExperienceCard.tsx:45`、`EducationCard.tsx:37`
- `features/articles/RichEditor.tsx:392`

**やること:**

1. 通知系 `alert` → `useToast()`、確認系 `confirm` → `ConfirmDialog` に置換。
   破壊的操作（求人削除・面接キャンセル・職歴削除）は `destructive` スタイルで。
2. `app/company/jobs/[jobId]/page.tsx:755-771` の公開バリデーションは「必須項目をすべて
   入力してください」の一括 alert をやめ、未入力フィールドのインラインエラー表示＋
   先頭の該当フィールドへスクロールに変える（フィールド単位の validity 判定は既にある
   `requiredOk` の AND を分解すればよい）。
3. **1画面ずつ適用してユーザー確認を取り、OKが出てから残りへ横展開する。**

**実施メモ（2026-07-07）:** ユーザー委任により全画面一括適用。公開バリデーションは
未入力項目を列挙する赤バナー（フォーム先頭・自動スクロール）＋エラートーストに変更し、
公開ボタンの disabled を解除（クリックで何が足りないか分かるように）。
フィールド単位のインラインエラー表示は F11 のフォーム部品側で実装する。

**コミット:** `refactor(frontend): replace native alert/confirm with Toast/ConfirmDialog`

### F7 共有アイコンの集約

**現状:** 同一定義のアイコンコンポーネントが最大9ファイルにコピペ（`BuildingIcon`/`CameraIcon` 9、
`BookmarkIcon`/`HomeIcon`/`SectionTitle` 8、`BriefcaseIcon`/`DocumentIcon`/`ClockIcon` 7、ほか6ファイル組が11種）。
主な重複元は `app/company/jobs/new/page.tsx:1553-`、`[jobId]/page.tsx:1896-`、`preview/page.tsx:751-`、
`app/test/jobs/{edit,view}/page.tsx`。既に `app/profile/[username]/Icons.tsx` に共有アイコン集がある。

**やること:**

1. `Icons.tsx` を `src/components/icons/index.tsx` へ昇格（named export。profile 側は import 差し替え）。
2. 求人ページ群のローカル定義と突き合わせ、同名・同形のものは共有版に置換して削除。
   微妙に形が違うものは共有版に寄せる（見た目差分が出る場合はスクショで確認）。
3. `SectionTitle` はアイコンではないので `src/components/ui/` へ。

**コミット:** `refactor(frontend): consolidate duplicated icon components`

### F8 日付フォーマットの集約

**現状:** `formatDate` / `formatDateTime` / `timeAgo`（「◯分前/◯日前」）が18ファイルに個別実装。
`app/jobs/page.tsx:111` と `features/articles/ArticleCard.tsx:16` は同一ロジックの完全重複。
ほか `app/post/[id]/PostDetail.tsx:15,26`、`app/scout/[scoutId]/page.tsx:21,26`、`app/interviews/page.tsx:18,31`、
`app/company/scout/**`、`app/admin/{admins,users,companies}/page.tsx`、
`features/{timeline,messaging,scout,interview,profile}` 配下ほか。

**やること:**

1. `src/lib/date.ts` に `formatDate` / `formatDateTime` / `formatRelative` を実装。
   既存実装の出力形式を棚卸しして最大公約数を決める（「YYYY/MM/DD」「YYYY年M月D日」等の
   表記ゆれは、画面ごとの現状表記を維持する引数を持たせるか、この機会に統一するかを
   ユーザーに確認してから実装する）。
2. 18ファイルのローカル実装を削除して差し替え。

**実施メモ（2026-07-07）:** 表記は**現状維持**（統一しない）と判断し、既存出力を再現する
`formatDate`（YYYY/MM/DD）/ `formatDateCompact`（YYYY/M/D）/ `formatDateTime` / `formatDateTimeCompact` /
`timeAgo` / `formatRelativeDate` / `formatRelativeTime` / `daysRemaining` を実装、15ファイルを差し替え。
1箇所でしか使わない特殊形式（interviews と InterviewDetailPanel の曜日付き、PostDetail の長文形式、
MessageThread の日付セパレータ）は現地に残した。

**コミット:** `refactor(frontend): centralize date formatting in src/lib/date.ts`

### F9 API ボイラープレートの共通化

**現状:** `if (error || !data) throw new Error(...)` が feature api.ts 群に計50回コピペ
（scout 15、messaging 10、job-posting 9、timeline 9、work-values 7、career-interest 7、
articles 6、interview 6、job-application 4、integrated-report 3）。
一方 `app/profile/[username]/api.ts:31-43` に良い共通ヘルパー `unwrap()` / `run<T>()` が既にある。

**やること:**

1. `run` / `unwrap` を `src/lib/api-result.ts`（または `src/external/client/` 直下）へ移動。
   エラーメッセージは呼び出し側で上書きできる引数を残す（`run(call, "応募に失敗しました")`）。
2. 全 feature の api.ts を `return run(sdkCall(...))` 形式に機械的に書き換え。
   挙動（throw する条件・メッセージ）は変えない。
3. profile 側は新パスから import。

**実施メモ（2026-07-07）:** `src/lib/api-result.ts` に `ApiError extends Error` + `run(call, fallbackMessage)` を実装。
work-values / career-interest の api.ts は `response.status` を使った動的エラーメッセージ・404→null 分岐のため
機械的置換の対象外として残した（挙動を変えないため）。messaging の unread-count 系 2 関数（エラー時 `{count:0}`）は
F16 で対応。エラーは Error インスタンス（ApiError）になり、サーバメッセージがあれば固定文言より優先される。

**コミット:** `refactor(frontend): share run/unwrap API helpers across features`

### F10 テーマカラー・選択肢マスタ・ステータスマップの定数化

**現状:**

- アクセントカラー `#3D8B6E` が27ファイル102箇所にハードコード。各ファイルで
  `const ACCENT = "#3D8B6E"` を再定義（`company/jobs/new/page.tsx:19` ほか5ファイル以上）。
- 求人選択肢マスタ（`JOB_CATEGORIES` / `EMPLOYMENT_TYPES` / `REMOTE_POLICIES` / `SMOKING_POLICIES`
  ＋ `EMPLOYMENT_TYPE_TO_API`）が `company/jobs/new`、`company/jobs/[jobId]`、`test/jobs/edit`、
  `jobs/page.tsx:123,132` に重複定義。**検索側と編集側で `EMPLOYMENT_TYPES` の中身がズレている**
  （分散の実害。どちらが正か確認して統一する）。
- `jobSeekingStatus` のラベル・色が4ファイルでバラバラ実装（`ProfileHeaderCard.tsx:31` の Record、
  `applications/page.tsx:762`、`saved-candidates/page.tsx:483` と `talents/page.tsx:1523` のインライン三項）。
- 応募ステータス等のローカルマップ散在（`applications/page.tsx:25-30`、`scout/[scoutId]/page.tsx:11`、
  `admin/reports/page.tsx:48`）。

**やること:**

1. Tailwind 4 の `@theme`（`globals.css`）に `--color-brand: #3D8B6E` を定義し、
   `bg-brand` / `text-brand` / `border-brand` 等で置換。インライン `style` で必要な箇所は
   `var(--color-brand)` を使う。TSから参照する箇所用に `src/constants/theme.ts` も用意。
2. `src/constants/job-options.ts` を新設（`profile-options.ts` と同じ構造）し、選択肢マスタと
   API値マップを集約。編集/検索/テストページすべてここから import。
3. `<JobSeekingBadge status={...} />` を `src/components/ui/` に作り、4ファイルを置換。
   ほかのステータスマップも `src/constants/` へ。

**実施メモ（2026-07-07）:**
- `@theme { --color-brand }` を追加し、クラス内 `[#3D8B6E]` は `brand` に、TS 内の生リテラルは
  `src/constants/theme.ts` の `ACCENT` に置換（`var(--accent)` 既存利用は現状維持）。
- `EMPLOYMENT_TYPES` のズレは**編集側を正**と判断。検索側の「アルバイト」「PM」「営業」
  「一部リモート」「出社」は保存値に存在せず**0件ヒットの壊れたフィルタ**だったため、
  `SEARCH_*` 定数（編集側マスタ由来）に統一（= フィルタ選択肢の表示が変わる）。
  未使用だった `EMPLOYMENT_TYPE_TO_API` は削除。
- `SEEKING_STATUS_MAP` を `src/constants/seeking-status.ts` に集約、`JobSeekingBadge` を新設し
  talents / saved-candidates / profile ヘッダーを置換（profile はパレットが 100/800→50/700 に微変更）。
- 応募/スカウト/レポートの単発ステータスマップ（applications・scout/[scoutId]・admin/reports）は
  単一使用のため現地に残した。

**コミット:** `refactor(frontend): centralize brand color, job options, and status maps`

---

## Phase C: 大型リファクタ

### F11 求人フォームの統合（F7, F10 依存）

**現状:** 新規作成と編集がフォーム状態・JSXをほぼ全複製:

- `app/company/jobs/new/page.tsx` — 1861行、単一関数 約1140行、`useState` 45個
- `app/company/jobs/[jobId]/page.tsx` — 2204行、単一関数 約1440行、`useState` 50個
- `app/company/jobs/preview/page.tsx`、`app/test/jobs/{edit,view}/page.tsx` にも同系の複製
- `InlineInput` / `InlineTextarea` / `InlineSelect` / `InlineTagInput` / `BenefitTagInput` /
  `EditableHighlightCard` / `EditableConditionGroup` が各3ファイルに重複
  （`new/page.tsx:80-101` と `[jobId]/page.tsx:125-146` の `InlineInput` はバイト単位一致を確認済み）

**やること:**

1. `src/features/job-posting/` 配下に以下を新設:
   - `useJobForm.ts` — 40個超の個別 `useState` を1つのフォームオブジェクト
     （`useReducer` か単一 state + フィールド更新関数）に集約。新規/編集の初期値注入に対応。
   - `components/JobPostingForm.tsx` — 入力UI本体（`value` / `onChange` を受ける制御コンポーネント）。
   - `components/inline-inputs.tsx` — `InlineInput` 等の共通フォーム部品。
2. new → edit → preview → test の順に1ページずつ差し替え。**各ページ差し替えごとに
   見た目と保存動作をユーザー確認**（下書き保存・公開・画像アップロード・プレビュー同期
   `preview-channel.ts` が壊れやすいポイント）。
3. F6 で作ったインラインバリデーションはフォーム部品側に持たせる。
4. 完了時、`company/jobs` 配下3ファイル＋`test/jobs` 2ファイルで計5,000行規模の削減見込み。

**コミット:** ページごとに分割コミット。例:
`refactor(frontend): extract shared JobPostingForm and useJobForm` →
`refactor(frontend): migrate job edit page to JobPostingForm` → …

**実施メモ（2026-07-07）:** 4コミットで完了。
- `src/features/job-posting/` に `useJobForm`（値・set・missingRequired・body/preview ビルダー）、
  `useJobPreviewChannel`、`useCompanyProfile`、`components/{JobPostingForm,TeamSection,inline-inputs,view-parts}` を新設。
- チームセクションは new（`SimpleTeamSection`）と edit（`TeamSectionWithSelector`）で挙動が違うため
  variant を分け、`JobPostingForm` の `teamSection` スロットに注入する構成。
- 未決事項#5 の `test/jobs/**` は**削除せず共通部品へ載せ替え**（モックアップローダ注入）。
  プロトタイプ独自の微妙な差分（select の truncate 有無・年収上限クランプ等）は本番版に統一された。
- 読み取り専用の `StatCell`/`HighlightCard`/`ConditionGroup` は `view-parts.tsx` に共有化し、
  preview・公開 `jobs/[jobId]`・`test/jobs/view` の3ページを移行（未入力フォールバックは `fallback` prop）。
- タイトル textarea の自動リサイズは ref＋onChange 方式に統一（new 側の onFocus 方式は廃止、挙動同等）。
- 削減: 対象5ページ＋公開詳細で約 -4,300 行（共有部品 +1,990 行を差し引き実質 -2,300 行超）。

### F20 巨大リストページの分割

**現状:** 検索フィルタ状態・取得・カード描画・ページネーションが単一コンポーネントに同居:

- `app/company/talents/page.tsx` — 1720行、`useState` 33、`useEffect` 12
- `app/jobs/page.tsx` — 1457行、`useState` 24、`useEffect` 8
- `app/company/applications/page.tsx` — 1106行

**やること:**

1. talents: `useTalentSearch()` フック（検索条件・結果・ページング・F4 のキャンセル処理を内包）
   ＋ `<FilterPanel>` ＋ `<TalentCard>` ＋ 詳細パネルに分割。
2. jobs: 同様に `useJobSearch()` ＋ `<JobCard>`。F14 で SSR 化する場合は先に F14 の設計を
   決めてから着手する（分割の切り方が変わるため）。
3. applications: 同様。
4. 挙動・見た目は変えない。1ページ = 1コミット。

**コミット:** `refactor(frontend): split talents page into hooks and components` など

**実施メモ（2026-07-07）:** 3コミット（1ページ=1コミット）で完了。挙動・見た目は不変。
- talents: `features/talent-search/` に `useTalentSearch`（フィルタ・診断設定・結果・URL同期・保存済み）、
  `useCandidateDetail`（F4のAbort込み）、`components/{SearchFilterPanel,DiagnosticPanel,DiagnosticCandidateCard,CandidateDetail}`。
  ページはスクロール永続化・sticky/wheel制御・sentinelのみ保持（1728→約290行）。
- jobs: `features/job-search/` に `useJobSearch`（検索・価値観フィルタ・マッチ度計算・差分チームスコア取得）、
  `match.ts`、`components/{JobCard,JobDetailPanel,MatchBadge}`。フィルタバーはページに残置（1463→約400行）。
  F14でSSR化する際は `useJobSearch` に初期データ注入引数を足す想定。
- applications: `features/job-application/` に `useApplicationsSearch`、`constants.ts`（ステータスマップ・日付プリセット）、
  `components/{ApplicationCard,ApplicationDetail}`（1106→約350行）。

---

## Phase D: Next.js 機能の活用

### F12 `loading.tsx` / `error.tsx` / `not-found.tsx` の追加

**現状:** app 配下に1つも存在しない（`global-error.tsx` 含めゼロ）。サーバーフェッチ中は真っ白、
fetch 失敗でセグメントがクラッシュ、`app/articles/[id]/page.tsx` は `notFound()` を呼ぶのに
デフォルト404が出る。

**やること:**

1. ルート直下に `app/loading.tsx`（全体スピナー）、`app/error.tsx`（再試行ボタン付き）、
   `app/not-found.tsx`、`app/global-error.tsx` を追加。デザインは既存トーンに合わせる。
2. サーバーフェッチする主要ルート（`articles/[id]`、`jobs`、`companies/[id]`、
   `profile/[username]`）に個別 `loading.tsx` を置き、スケルトン表示にする。
3. 手動確認: バックエンドを落として各ページを開き、error.tsx が出て再試行できること。

**コミット:** `feat(frontend): add loading/error/not-found boundaries`

### F13 `next/image` への移行

**現状:** `next/image` 使用ゼロ、17ファイルが生 `<img>`。カバー画像等はサイズ未指定で CLS の原因。
`next.config.ts` に `images` 設定なし。主要箇所:
`app/profile/[username]/ProfileHeaderCard.tsx:153,200`、`app/jobs/page.tsx:688,947,956`、
`features/articles/ArticleView.tsx:268`、`features/timeline/ArticlePreviewCard.tsx:66`。

**やること:**

1. 画像の配信元を棚卸しし、`next.config.ts` に `images.remotePatterns` を設定
   （ローカル `/api/uploads/**` と外部URLの両方を確認）。
2. LCP になりやすい大画像（カバー・求人画像・記事カバー）から `next/image` に置換。
   アスペクト比固定コンテナ + `fill`、または `width`/`height` 指定。
3. アバター等の小画像も置換（`sizes` 指定を忘れない）。
4. **1画面ずつ差し替えて見た目（トリミング・比率）をユーザー確認。**
   Cloud Run デプロイ構成（standalone output）で画像最適化が動くことも確認する
   （動かない場合は `unoptimized` や loader 検討を報告してから進める）。

**コミット:** `perf(frontend): migrate images to next/image`

### F14 公開ページの SSR 化＋`generateMetadata`

**現状:** 149 tsx 中118が `"use client"`。特に SEO 対象の公開ページがクライアントフェッチ:
`app/jobs/page.tsx`（一覧。`useEffect` からクライアント fetch）。
また `generateMetadata` はルートの固定 metadata のみで、記事・求人・企業・プロフィールの
個別タイトル/OGP がなくすべて "inselfy" 固定。`app/page.tsx`（HomePage）はサーバー構成の
良い手本になっている。

**やること:**

1. 対象と優先順: ① `jobs`（一覧＝SEO効果最大）② `jobs/[jobId]` ③ `companies/[id]`
   ④ `articles/[id]`（既にサーバーフェッチなら metadata のみ）⑤ `profile/[username]`。
2. 各ページで「初期データ取得＋静的表示」をサーバーコンポーネントに、「検索フィルタ・
   無限スクロール・ボタン類」を小さなクライアントコンポーネントに分離
   （`app/page.tsx` と同じ構成）。jobs 一覧は F20 の分割と同時に行うと二度手間がない。
3. 各動的ルートに `generateMetadata` を実装（記事タイトル・求人名＋企業名・OGP画像）。
4. 認証依存の表示（ブックマーク状態等）はクライアント側に残してハイドレーション後に反映。
5. **1ルートずつ適用し、表示・検索・ページングをユーザー確認してから次へ。**

**コミット:** ルートごとに分割。例: `perf(frontend): server-render public jobs listing` →
`feat(frontend): add generateMetadata to public routes` → …

### F15 重量ライブラリの dynamic import

**現状:**

- `features/articles/ArticleForm.tsx:7` が `RichEditor`（417行、`@tiptap/*` 一式）を静的 import。
  記事作成/編集時しか使わないのに初期バンドルに同梱。
- `app/profile/[username]/ProfileHeaderCard.tsx:10` が `ImageCropModal`（`react-easy-crop`）を
  静的 import。アバター/カバー編集時しか使わないモーダル。

**やること:**

1. 両者を `next/dynamic(() => import(...), { ssr: false, loading: <スケルトン> })` に変更。
2. `npm run build` の First Load JS で該当ルートのサイズ削減を確認して記録する。

**コミット:** `perf(frontend): lazy-load RichEditor and ImageCropModal`

---

## Phase E: データ層・型のクリーンアップ

### F16 未読 Context 3種の統一

**現状:** `features/messaging/unread-context.tsx`、`features/scout/unread-context.tsx`、
`features/messaging/company-unread-context.tsx` がほぼ同型の実装で、それぞれに問題:

1. 生成SDKでなく素の `fetch("/api/...")`（schema-first 方針違反）。
2. Provider の `value={{ unreadCount, refresh }}` が非メモ化で、ルートレイアウト直下にあるため
   再レンダリングが全 consumer に波及。
3. scout はスカウト50件を取得してクライアントで `some(status==="sent")` 判定
   （サーバでカウントすべき）。
4. `.catch(() => {})` で失敗が無言（0件表示のまま）。

**やること:**

1. 3つを汎用の `createUnreadContext`（または1つの `useUnreadCount(kind)` フック＋Provider）に統合。
2. `value` を `useMemo` 化。
3. フェッチは生成SDKに置換。未読カウント用エンドポイントが OpenAPI に無ければ、
   スキーマ追加（`GET /api/scouts/unread-count` 等）→ バックエンド実装 → SDK 再生成の順で対応
   （バックエンド変更が必要な旨をユーザーに報告してから着手）。
4. エラー時は前回値を保持し、コンソールに記録（未読バッジなのでUI通知までは不要）。

**コミット:** `refactor(frontend): unify unread contexts on generated SDK`

**実施メモ（2026-07-09）:** `features/unread/create-unread-context.tsx` に共通ファクトリを実装し
3 Context を薄いラッパー化。scout 用に `GET /api/scouts/unread-count`（status='sent' の件数）を
TypeSpec 追加→バックエンド実装（controller→InputPort→interactor→repository）→SDK 再生成で新設
（`feat(backend)` コミット、curl で 1件/0件/未認証401 を確認）。scout の `hasUnread` は
`unreadCount` に置き換え（consumer 2箇所修正）。

### F17 プロフィールページのウォーターフォール解消

**現状:** `app/profile/[username]/page.tsx` は Server Component でデータ取得済みなのに、
`AiReportCard.tsx:28-41`・`SimilarUsersCard.tsx:21-37`・`FollowButton.tsx:18-28` が mount 後に
追加フェッチ。しかも `AiReportCard`・`FollowButton` は `useAuth()` の解決待ち
（`auth-context.tsx:54-70` の `/api/auth/me` → 失敗時 `/api/auth/refresh` の直列）後に発火するため
多段ウォーターフォールになり、初期表示が遅くちらつく。

**やること:**

1. レポートステータス・類似ユーザー・フォロー状態を `page.tsx`（サーバー、cookie 認証済み）で
   並行取得し、props で流し込む。クライアント側の fetch とローディング state を削除。
2. フォローのトグル等の書き込みはクライアントに残す（初期値だけサーバーから）。
3. 発展（任意）: `auth-context` の初期ユーザーをレイアウトのサーバー側で解決して注入し、
   初回 `/api/auth/me` ウォーターフォール自体を消す。影響範囲が広いので着手前にユーザー確認。

**コミット:** `perf(frontend): resolve profile page data on the server`

**実施メモ（2026-07-09）:** フォロー状態・類似ユーザーを page.tsx で並行取得し props 注入。
AIレポート状態は fetchPanelData 取得済みの `intReportHasReport` から導出（追加リクエスト不要）。
着手中に既存バグを発見: `cookies()` はデコード済み値を返すため日本語入り `displayName` cookie を
そのまま Cookie ヘッダに載せると fetch が throw し、**SSR の認証付きフェッチ全てが silent fail していた**
（診断パネルの SSR 欠落等の原因）。`src/lib/cookie-header.ts` の `buildCookieHeader`（encodeURIComponent
で再エンコード）に4ページを統一して修正（`fix(frontend)` コミット）。発展項目（auth-context の
サーバー解決）は影響範囲が広いため未着手。

### F18 型安全性クリーンアップ

**現状:**

- `catch (err: any) { setError(err.message) }` 型が約10箇所:
  `app/jobs/page.tsx:260`、`app/company/scout/**`（5ファイル）、`app/company/teams/**`（2ファイル）、
  `app/company/login/page.tsx:33`。`compose/page.tsx:53` は正しいパターン
  （`err instanceof Error ? err.message : "..."`）の既存例。
- `features/company-auth/company-auth-context.tsx:57` — `(err as any).code = data.code`。
- `app/jobs/page.tsx:95` — `highNeedIds.has(n.needId as any)`。
- `features/signup/components/SignUpForm.tsx:40,55` — `as unknown as` 二重キャスト
  （SDK のエラー/成功スキーマ定義とズレている）。
- `features/messaging/useWebSocket.ts:20` — ticket 取得レスポンスが無型。
- `features/admin/api.ts:8-14` — `setAdminKey`/`clearAdminKey` に `typeof window` ガードと
  try/catch がない（`getAdminKey` にはある）。

**やること:**

1. `src/lib/errors.ts` に `getErrorMessage(err: unknown): string` を作り、`catch (err: any)` を
   `catch (err)` ＋ `getErrorMessage(err)` に統一。エラーコードが必要な箇所は独自
   `ApiError extends Error { code }` クラスを定義して `as any` 代入を排除。
2. `jobs/page.tsx:95` は `highNeedIds` を `Set<string>` にして `as any` 除去。
3. SignUpForm は OpenAPI スキーマ側の成功/エラー定義を確認し、生成型がそのまま使えるよう
   スペックを修正 → SDK 再生成 → 二重キャスト撤廃（スペック変更が必要なら curl 検証も行う。
   契約クリーンアップ済みの運用ルールに従う）。
4. `useWebSocket.ts` の ticket レスポンスに型を付ける（SDK にあれば SDK 経由に）。
5. `admin/api.ts` の書き込み側にもガードと try/catch を追加。

**コミット:** `refactor(frontend): remove any-typed error handling and unsafe casts`

**実施メモ（2026-07-09）:** `getErrorMessage` は新規ファイルでなく既存の `lib/api-result.ts` に追加
（ApiError と同居）。SignUpForm の二重キャストは契約クリーンアップ済みの現行スペックでは不要になって
いたため、スペック変更なしで撤廃（409 の `{code:"CONFLICT"}` 形状は curl で確認）。
`as any` の実在箇所は plan 記載の `jobs/page.tsx` から `features/job-search/match.ts` に移動していた。

### F19 AIレポート生成ステータスのポーリング

**現状:** `app/profile/[username]/AiReportCard.tsx:28-41`、
`app/integrated-report/[requestId]/IntegratedReportContent.tsx:129-147`、
`app/work_values/[sessionId]/WorkValuesContent.tsx:837-855` が mount 時に一度だけステータス取得。
`pending`（生成中）→ `ready` の遷移を検知できず、リロードするまで「生成中」のまま。

**やること:**

1. `src/lib/usePolling.ts`（または各所共通のフック）を作り、`pending` の間だけ
   指数バックオフ（例: 5s → 10s → 20s、上限 60s）で再取得。`ready`/`failed` になったら停止。
   タブ非表示時は停止（`document.visibilityState`）。cleanup でタイマー解除。
2. 上記3箇所に適用。F17 で AiReportCard がサーバー取得化された場合は、初期値サーバー＋
   pending 時のみクライアントポーリングの構成にする。

**コミット:** `feat(frontend): poll AI report status while generating`

**実施メモ（2026-07-09）:** `src/lib/usePolling.ts` を新設（vitest 6件付き）。適用は計画の3箇所＋
同型の `CareerInterestContent` の計4箇所。WV/CI は「レポートを作成する」押下後の「作成中」表示
（`notFound`）の間のみポーリング。AiReportCard は F17 のサーバー初期値＋pending 時のみポーリングの
構成（未ログイン時は 401→/login リダイレクトを避けるため呼ばない）。

---

## Phase F: Phase E 実施中に見つかったリファクタ候補

2026-07-09 の Phase E 作業中のコードベース観察に基づく（行番号は当時のもの）。
優先度は F21 ≧ F22 > F23〜F25 > F26。

### F21 AIレポートセクション3実装の統合

**現状:** ほぼ同型の実装が3つ（＋部分的に4つ目）ある:

- `app/work_values/[sessionId]/WorkValuesContent.tsx` の `AiReportSection`（819行〜）
- `app/career_interest/[sessionId]/CareerInterestContent.tsx` の `CIAiReportSection`（775行〜）
- `app/integrated-report/[requestId]/IntegratedReportContent.tsx`（コンポーネント全体が同構造）

重複しているもの: `useTypewriter` フック（3コピー）、`reportContent/firstView/initialLoading/
showReport/scrollSpacer` の state 一式、「スクロール完了を待って `start()`」する `handleClick`、
prose クラス（アクセント色 emerald/purple/amber だけ違う）、F19 で入れた `usePolling` ブロック。
F19 では同じポーリングコードを3箇所にペーストする羽目になった（重複の直接コスト）。

**やること:**

1. `features/ai-report/` を新設し、`useTypewriter` と共通の `<AiReportSection>` を切り出す。
   可変点は props で受ける: `fetchReport: () => Promise<{content, firstView} | null>`、
   アクセント色（prose クラス生成）、見出し・未生成時文言、`isOwner`、ポーリング有効条件。
2. 3箇所を差し替え。挙動・見た目は変えない。
3. ついでに900行超の `WorkValuesContent.tsx` / `CareerInterestContent.tsx` をセクション単位で
   分割する（Phase C/F20 の分割パターン踏襲）。`wv-ripple` / `ci-ripple` 等のインライン
   keyframes CSS もほぼ同一なので共通化候補。
4. 手動確認: 3ページのレポート表示・タイプライター演出・生成中ポーリング。

**コミット:** `refactor(frontend): unify AI report sections`

**実施メモ（2026-07-10）:** `features/ai-report/` に `useTypewriter` と `<AiReportSection>` を新設。
可変点は `fetchReport`（呼び出し側で useCallback 必須）・`accent`（emerald/purple/amber の3テーマ、
Tailwind JIT のためクラスはテーマ毎にリテラル定義）・`heading`・`isOwner`・`variant` で受ける。
`variant="generate"`（WV/CI: 作成ボタン＋作成中ポーリング）と `variant="view"`（統合: mount直後から
オーナーのみポーリング＋「見る」ボタン）で挙動差を吸収。統合レポートのチャート群は children で注入。
ついで分割も実施: WV 978→75行・CI 951→76行（`features/{work-values,career-interest}/components/` へ
セクション単位で分割）、`wv-/ci-ripple` keyframes は `app/components/ResultHeroEffects.tsx`
（CSS変数 `--hero-ripple` で色指定）に、重複 `ChevronIcon` は `app/components/ChevronIcon.tsx` に共通化。
検証: tsc/biome/vitest29件/next build ✓。Playwright で3ページの表示・未生成→作成ボタン→作成中表示・
ポーリング自動差し込み・統合チャート4種を確認。タイプライター演出のみ dev では StrictMode の
mount二重fetchが firstView を消費するため発火経路に入らず（リファクタ前からの dev 特有挙動）、
コード共通化のみで打ち切り。

### F22 `isOwner = true` デフォルトの廃止

**現状:** `ProfileContent`・`ProfileHeaderCard`・`PanelNavigator`（`serverIsOwner`）がいずれも
**省略時 `isOwner = true`**。診断3ページ（work_values / career_interest / integrated-report）は
isOwner を渡していないため、**他人のセッションページを開いてもオーナー扱い**になり、
AiReportCard・ResumeUploadCard・編集ボタンが出る／FollowButton が出ない。
「省略すると権限が強くなる」デフォルトは事故のもと（F17 でもこの挙動の踏襲を強いられた）。

**やること:**

1. 3コンポーネントの isOwner を必須 prop 化（またはデフォルト false）。
2. 診断3ページでサーバー側で isOwner を計算して渡す（profile/page.tsx と同様に
   `/api/auth/me`＋username cookie フォールバックで viewer を解決し `data.username` と比較。
   cookie 転送は必ず `buildCookieHeader` を使う）。
3. **表示が変わる**（他人のセッションでオーナー用カードが消える）ので、本人閲覧・他人閲覧の
   両方を目視確認。

**コミット:** `fix(frontend): stop defaulting isOwner to true`

**実施メモ（2026-07-10）:** デフォルト廃止は計画の3コンポーネントに加え、同じ「省略＝オーナー扱い」
だった `WorkValuesResultContent` / `CareerInterestResultContent` / `IntegratedReportContent` /
`AiReportSection` と PanelNavigator 内の3プレースホルダも含め **isOwner を全箇所必須 prop 化**
（デフォルト false ではなくコンパイルエラーで渡し忘れを検出する方式）。viewer 解決は
profile/page.tsx の `getCurrentUsername`（/api/auth/me→refresh フォールバック）と username cookie
フォールバックを `features/auth/viewer.ts` に切り出して4ページで共用。診断3ページには isOwner に加えて
`displayName`・`wvHasReport`/`ciHasReport`（他人閲覧でもレポート有りなら結果パネルを出す＝profile と
同じゲーティング）、`initialFollowing`（`fetchInitialFollowing` を fetchPanelData.ts へ移設・共用）と
フォロー数も配線した（これが無いと他人閲覧で FollowButton が出ないまま＝F22 の問題文の残り半分）。
PanelNavigator の `serverIsOwner || user?.username === username` のクライアント側昇格は
本人にしか権限を足さないため維持。検証: tsc/biome（既存警告3件のみ）/vitest 29件/next build ✓。
bypass-login 2ユーザーで WV・CI・profile の SSR HTML を本人/他人比較し、オーナー用カード
（職務経歴書アップロード・編集ボタン）の消失、他人側のフォロー/メッセージボタン表示、
レポート有りセッションの結果表示、レポート無しセッションの「受診を依頼する」プレースホルダを確認。
ブラウザでの見た目確認は未実施。

### F23 サーバー用 SDK クライアントで cookie 転送を自動化

**現状:** `cookieHeader` を page → `fetchPanelData` → 各 API 関数へ optional 引数でバケツリレー
している。`fetchRest` 内の一部呼び出し（experiences / educations / skills / followers 等）は
転送しておらず、公開 API だからたまたま動いているだけ。手組みの cookie 連結が
fe81704 の ByteString バグ（displayName cookie）の温床にもなった。

**やること:**

1. サーバー専用モジュール（例: `src/external/client/api/server.ts`、`import "server-only"`）で
   SDK クライアントの fetch ラッパー／request interceptor から `next/headers` の `cookies()` を
   読み、`buildCookieHeader` で自動注入する（interceptor 内で `await cookies()` すれば
   Next の AsyncLocalStorage によりリクエストスコープになる）。
2. 各 API 関数の `cookieHeader` 引数を段階的に削除（work-values / career-interest /
   integrated-report / fetchPanelData / profile page の手渡し箇所）。
3. 発展（F17 の発展項目と同じ）: layout のサーバー側で `/api/auth/me` を解決して
   auth-context の initialUser として注入し、クライアント初回の auth ウォーターフォールを消す。
   影響範囲が広いので着手前にユーザー確認。

**コミット:** `refactor(frontend): auto-forward auth cookies on server-side SDK calls`

**実施メモ（2026-07-10）:** `src/external/client/api/server.ts`（`import "server-only"`＋
`server-only` パッケージを新規導入）に request interceptor を実装。`await cookies()` →
`buildCookieHeader` で `Cookie` ヘッダを自動注入する。呼び出し側が Cookie を明示指定した場合は
上書きしない・リクエストスコープ外（ビルド時プリレンダ等）は try/catch で転送スキップ。
**登録はルート単位のオプトイン**: SSR で SDK を呼ぶ page が `import "@/external/client/api/server"`
を読み込む方式（profile / work_values / career_interest / integrated-report の4ページに適用。
新規 SSR ページで認証付き SDK 呼び出しをする場合はこの import を忘れないこと）。
`cookieHeader` 引数は work-values / career-interest の各3関数、fetchPanelData 系
（fetchPanelDataByUsername/ByUserId/fetchInitialFollowing/checkReportExists/fetchRest）、
profile page の fetchSimilarUsers から全廃。`getCurrentUsername` は素の fetch のため引数を
やめて自前で `cookies()` を読む形に変更（viewer.ts も server-only 化）。副次効果として
`fetchRest` 内で転送されていなかった experiences / educations / skills / follows 系にも
Cookie が載るようになった。発展項目3（layout での initialUser 注入）は未着手。
検証: tsc / biome / next build ✓。bypass-login 2ユーザーで profile・WV・CI の SSR HTML を
本人/他人/未ログイン比較 — 本人=編集UI＋診断パネル、他人=フォローボタン＋診断パネル、
未ログイン=profile は公開情報のみ・WV セッションページは not-found（診断閲覧は要ログインの
既存ポリシーどおり）。統合レポートページは DB にリクエストが無く共通経路の検証のみ。

### F24 401 インターセプタの /login リダイレクトをオプトアウト可能に

**現状:** `src/external/client/api/client.ts` の response interceptor が 401 時に refresh →
失敗で `window.location.href = "/login"`。このため未ログインで認証付き GET を呼ぶ
コンポーネントは**ページごと /login に飛ばされる**。AiReportCard / FollowButton には
それを避けるための `isAuthenticated` ガードとコメントが散在している（F17/F19 参照）。

**やること:**

1. per-request でリダイレクトをオプトアウトできる仕組みを追加
   （例: リクエストの meta / カスタムヘッダで `skipAuthRedirect` を渡し interceptor で除去・判定）。
2. 未読バッジ・カード系のベストエフォート取得をオプトアウトに切り替え、
   散在する isAuthenticated ガードを削減。
3. 手動確認: 未ログインでプロフィール閲覧してもリダイレクトされない／
   保護ページでは従来どおり /login に飛ぶ。

**コミット:** `refactor(frontend): make 401 login redirect opt-out per request`

**実施メモ（2026-07-10）:** 着手動機は F22 検証中に顕在化した **未ログインで /login が毎秒約5回
無限リロードするバグ**（実測 12秒55回、HEAD でも再現＝F22 とは無関係の既存問題）。ルートレイアウトの
未読バッジが認証付き GET → 401 → インターセプタが無条件 `window.location.href="/login"` → /login
再マウントで再発、のループだった。実装: `client.ts` に擬似ヘッダ `X-Skip-Auth-Redirect` 方式の
`skipAuthRedirect` オプションを追加（送信前に fetch ラッパーで除去しバックエンドには送らない。
判定は response interceptor 側で除去前の request から行う）。加えて **/login 上では常にリダイレクト
しない**ガードも追加（オプトアウト漏れでもループ不能に）。オプトアウト適用: 未読バッジ3種
（candidate/company メッセージ・スカウト）＋ `getIntegratedReportStatus`。AiReportCard の
isAuthenticated ガードと integrated-report/api.ts の⚠️コメントは削除。auth-context /
company-auth-context は素の fetch でインターセプタ非経由のため対象外。検証（Playwright）:
未ログイン /login はリロードループ消失、未ログインでのプロフィール閲覧は /login に飛ばされず閲覧可、
ログイン済み（bypass-login cookie）は unread 200・表示正常。なお現状 anon で非オプトアウトの
認証付き GET を撃つページは無く（/scout /messages は user 解決後にフェッチ）、リダイレクト経路は
コード上維持（トークン完全失効時の挙動）。散在ガードの削減は AiReportCard のみ
（JobDetail 系の isAuthenticated は UX 分岐を兼ねるため維持）。

### F25 レポート存在チェックの軽量化

**現状:** `features/profile/fetchPanelData.ts` の `checkReportExists` が `getAiReport` で
**レポート本文を丸ごと取得して** `!!content` を見るだけ。その後クライアント側の
AiReportSection がもう一度本文を取得するため、長文レポートを2回転送している。
統合レポートには `latest-request` に `hasReport` があるが、WV / CI には無い。

**やること:**

1. WV / CI の latest result レスポンス（または専用エンドポイント）に `hasReport` 相当を追加:
   TypeSpec 変更 → バックエンド実装 → SDK 再生成 → curl 検証（契約クリーンアップの運用ルールに従う）。
2. `fetchPanelData` から本文取得の存在チェックを排除。

**コミット:** `perf(frontend): stop fetching full AI reports for existence checks`

**実施メモ（2026-07-10）:** 専用エンドポイントではなく **WV/CI の結果レスポンス
（`WVResultResponse`/`CIResultResponse`）に `hasReport: boolean` を追加**する案を採用
（fetchPanelData は latest result を既に取得しているため追加リクエストゼロ）。
TypeSpec 変更 → generate-openapi.sh → make oapi → SDK 再生成。バックエンドは経路ルールに従い
QueryService port を新設: `WorkValuesReportQueryService` / `CareerInterestReportQueryService`
（`ExistsBySessionID`、gateway は ai_reports / ci_ai_reports への EXISTS 1クエリ）。
entity（workvalues.Result / careerinterest.Result）に HasReport を追加し、
GetLatestResult / GetResultBySessionID で設定（SubmitResult 直後は常に false のまま）。
presenter・wire_diagnosis.go も配線。フロントは `checkReportExists`（本文丸ごと取得）を削除し
`wvResult.hasReport / ciResult.hasReport` を参照。
検証: backend build/test/lint ✓、frontend tsc/biome/vitest 29件 ✓。curl で
レポート有りセッション=hasReport:true・無し=false を latest / by-session 両方で確認。
SSR HTML 比較で本人/他人のパネル表示・レポート無しユーザーの「受診を依頼する」
プレースホルダを確認。バックエンドは新バイナリで再起動済み。

### F26 biome 既存エラー・警告の解消

**現状（2026-07-09 時点）:** `npx biome check src` で error 2件（`app/profile/[username]/AboutCard.tsx:83`
の noUselessFragments 等）、warning 約75件（useExhaustiveDependencies が大半）、info 18件。

**やること:** エラー2件は即修正。警告は FIXABLE なものから機械的に。
exhaustive-deps 系は挙動が変わり得るので1件ずつ判断（無理に全消ししない）。

**コミット:** `chore(frontend): fix biome errors and fixable warnings`

**実施メモ（2026-07-10）:** 着手時点でエラーは既に0（69 warnings / 18 infos）。最終的に
`biome check src` は**完全クリーン**。内訳:
- 機械修正: useTemplate 14（文字列連結のみ）・noUselessFragments 2・useOptionalChain 1・
  useParseIntRadix 2・noUnusedImports 10
- 死コード削除: Sidebar の未使用アイコン4つ＋未使用 `debug` prop、未使用の計算済み変数4件、
  未使用 prop（ProfileHeaderCard の `experienceCount`、scout ReplyBubble の `userId`）
- noDocumentCookie 1: Cookie Store API は Safari 未対応のため理由付き biome-ignore で維持
- useExhaustiveDependencies 41 は1件ずつ判断:
  - **実修正3件**: useJobSearch のデバウンス effect に search/valueFiltersParam を追加
    （fetchJobs 経由で既に再実行されるため挙動不変）、company/messages の loadMessages を
    useCallback 化した effect の前へ移動＋refreshUnread を deps に追加＋effect deps に
    loadMessages 追加、PanelNavigator の goTo を useCallback 化（minIndex 宣言後に移動して
    TDZ 回避、定数 panelCount は deps 不要）
  - **残りは意図的パターンとして理由付き biome-ignore**: 再実行トリガー依存
    （reloadKey / likedReloadKey / userId / content / text = textarea 高さ・行数の再計測）、
    リスト描画後のリスナー張り直し（applications / talents の [list, loading]）、
    マウント時のみ実行（saved-candidates / templates / ArticleForm / useTalentSearch 復元 /
    MessagesPageContent ディープリンク）
  - 効かなくなっていた `eslint-disable-next-line react-hooks/exhaustive-deps` 遺物5件を除去
- 検証: tsc / vitest 29件 / next build ✓。主要ページ（/messages /compose /profile
  /work_values /articles/mine /company/applications）のスモークテスト 200、
  profile SSR の内容不変を確認。**注意: dev サーバー稼働中に `next build` を実行すると
  .next が競合して dev が落ちる**（本作業中に発生、dev 再起動で復旧）

---

## 未決事項（着手前にユーザー判断が必要）

| # | 項目 | 関連 |
|---|------|------|
| 1 | `Noto_Sans_JP` が `subsets: ["latin"]` のみで日本語グリフが next/font 最適化されていない（`app/layout.tsx:11`）。日本語も最適化配信するか、現状維持（システムフォントフォールバック）か | 独立 |
| 2 | ~~日付表記の統一~~ → **現状維持で解決済み**（F8 実施メモ参照） | F8 |
| 3 | ~~`EMPLOYMENT_TYPES` のズレ~~ → **編集側を正として解決済み**（F10 実施メモ参照） | F10 |
| 4 | ~~scout 未読カウントのバックエンドエンドポイント追加の可否~~ → **追加済み**（F16 実施メモ参照） | F16 |
| 5 | `app/test/jobs/**` ページの扱い（F11 で共通フォームに載せ替えるか、削除するか） | F11 |
| 6 | ~~ローカルで git hooks が動いていない~~ → **解決済み（2026-07-10）**。原因は `~/go/bin` が非対話シェルの PATH に無く fail-open していたこと。lefthook をルート package.json の devDependencies に移し（hook スクリプトがルート node_modules をフォールバック探索するため PATH 不要に）、gitleaks は lefthook.yml の各コマンドで `$HOME/go/bin` を PATH に追加。セットアップはルートで `npm install`（詳細 docs/security-secrets.md） | 独立 |
