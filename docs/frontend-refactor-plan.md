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
| F4 | [ ] | stale-response / 競合状態の解消（AbortController 導入） | 中 | バグ |

### Phase B: 共通基盤の構築（後続の前提）

| # | 状態 | 項目 | 規模 | 種別 |
|---|------|------|------|------|
| F5 | [ ] | 共通UI部品の昇格・新設（Modal / Toast / ConfirmDialog） | 中 | 基盤 |
| F6 | [ ] | `alert()` / `confirm()` 全廃（F5 依存） | 中 | UX |
| F7 | [ ] | 共有アイコンの集約（`src/components/icons/`） | 中 | 重複排除 |
| F8 | [ ] | 日付フォーマットの集約（`src/lib/date.ts`） | 小 | 重複排除 |
| F9 | [ ] | API ボイラープレートの共通化（`run` / `unwrap`） | 中 | 重複排除 |
| F10 | [ ] | テーマカラー・選択肢マスタ・ステータスマップの定数化 | 中 | 重複排除 |

### Phase C: 大型リファクタ

| # | 状態 | 項目 | 規模 | 種別 |
|---|------|------|------|------|
| F11 | [ ] | 求人フォームの統合（`useJobForm` + `<JobPostingForm>`）（F7, F10 依存） | 大 | 分割・重複排除 |
| F20 | [ ] | 巨大リストページの分割（talents / jobs / applications） | 大 | 分割 |

### Phase D: Next.js 機能の活用

| # | 状態 | 項目 | 規模 | 種別 |
|---|------|------|------|------|
| F12 | [ ] | `loading.tsx` / `error.tsx` / `not-found.tsx` の追加 | 小 | UX |
| F13 | [ ] | `next/image` への移行（全17ファイル） | 中 | パフォーマンス |
| F14 | [ ] | 公開ページの SSR 化＋`generateMetadata` | 大 | SEO・パフォーマンス |
| F15 | [ ] | 重量ライブラリの dynamic import（TipTap / react-easy-crop） | 小 | パフォーマンス |

### Phase E: データ層・型のクリーンアップ

| # | 状態 | 項目 | 規模 | 種別 |
|---|------|------|------|------|
| F16 | [ ] | 未読 Context 3種の統一（SDK化・メモ化・サーバカウント） | 中 | 統一 |
| F17 | [ ] | プロフィールページのウォーターフォール解消 | 中 | パフォーマンス |
| F18 | [ ] | 型安全性クリーンアップ（`err: any` / `as any` / 二重キャスト） | 中 | 型安全 |
| F19 | [ ] | AIレポート生成ステータスのポーリング | 小 | UX |

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

---

## 未決事項（着手前にユーザー判断が必要）

| # | 項目 | 関連 |
|---|------|------|
| 1 | `Noto_Sans_JP` が `subsets: ["latin"]` のみで日本語グリフが next/font 最適化されていない（`app/layout.tsx:11`）。日本語も最適化配信するか、現状維持（システムフォントフォールバック）か | 独立 |
| 2 | 日付表記の統一（「YYYY/MM/DD」vs「YYYY年M月D日」等の表記ゆれを F8 で統一するか現状維持か） | F8 |
| 3 | `EMPLOYMENT_TYPES` の検索側/編集側のズレ、どちらを正とするか | F10 |
| 4 | scout 未読カウントのバックエンドエンドポイント追加の可否 | F16 |
| 5 | `app/test/jobs/**` ページの扱い（F11 で共通フォームに載せ替えるか、削除するか） | F11 |
