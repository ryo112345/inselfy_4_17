# フォームエラーのインライン表示 — 設計書

作成: 2026-07-18。データ取得層ロードマップ Phase 4（orval 生成 Zod によるフォーム入力検証、
`docs/frontend-data-layer-roadmap.md`）の続編。検証ロジック自体は導入済みで、本書は
**エラーの見せ方をフィールド単位のインライン表示に引き上げる**ための設計と実施計画。

## 1. 背景と現状

Phase 4 で全主要フォームに送信前 zod 検証（生成スキーマ + 日本語メッセージ注入）が入ったが、
表示は次の2方式のまま:

| 方式 | 対象フォーム | 問題 |
|---|---|---|
| 単一エラー文字列（複数行 `whitespace-pre-line`） | signup / setup / 企業登録 / スカウト系 / 記事 / 求人新規 | フォーム上部か送信ボタン付近に固まって出るため、該当欄まで自分で探す必要がある |
| トースト（先頭1件＋「他N件」） | 企業プロフィール編集 / 求人編集 | 3.5秒で消える・全件見えない・該当欄が分からない |

`validateForm()` は既に `Record<フィールド名, メッセージ>`（FieldErrors）を返しているため、
**データは揃っており、やるのは表示側の配線のみ**。

## 2. リサーチまとめ（実装原則）

NN/g の[フォームエラー設計ガイドライン](https://www.nngroup.com/articles/errors-forms-design-guidelines/)、
[エラーメッセージガイドライン](https://www.nngroup.com/articles/error-message-guidelines/)、
[GOV.UK Design System の Error message](https://design-system.service.gov.uk/components/error-message/) /
[Error summary](https://design-system.service.gov.uk/components/error-summary/) に基づく。

1. **エラーは該当フィールドの直下に置く**。上部サマリーだけにしない（探させない）。
2. **色だけに頼らない**: 赤テキスト＋赤ボーダーに加え、エラー欄に薄い赤背景を敷く
   （長いフォームでスクロール中でも視認できる。NN/g 2024 推奨）。アイコンは任意。
3. **文言は具体的・建設的に**。「不正な入力です」ではなく「200文字以内で入力してください」。
   → これは Phase 4 の zod-params が既に満たしている。サマリーとインラインで**同一文言**を使う。
4. **タイミングは「送信時に全件」＋「送信後は編集で解消」**。入力中のリアルタイム検証
   （タイプごと）はやらない（打鍵中に叱られる体験になる）。blur 時検証は将来拡張とする。
5. **長いフォームには上部エラーサマリー**を併設し、件数と各エラーへのアンカーリンクを置く。
   送信失敗時はサマリー（または最初のエラー欄）へスクロール＆フォーカス移動。
6. **アクセシビリティ**: 入力に `aria-invalid`、エラー文に `id` を振って入力の
   `aria-describedby` から参照（スクリーンリーダーがフィールドとエラーを一緒に読む）。
7. **送信ボタンの無効化だけで防がない**（なぜ押せないのか分からなくなる）。既存の
   求人「公開する」ボタンの disabled は維持しつつ、バナー（missingRequired 一覧）併用を続ける。

## 3. 設計

### 3-1. 共通部品（新規、`frontend/src/components/form/`）

```
components/form/
  useFieldErrors.ts   … フォーム側の状態管理フック
  FieldError.tsx      … エラー文の表示（<p id={`${id}-error`} role="alert">）
  ErrorSummary.tsx    … 上部サマリー（件数＋アンカーリンク、role="alert"）
```

**useFieldErrors** — `validateForm` の結果を持ち回るだけの薄いフック:

```ts
const { fieldErrors, validate, clearField, firstErrorId } = useFieldErrors();

// 送信時
if (!validate(CompanyProfilesUpdateCompanyProfileBody, form)) {
  scrollToFirstError(); // firstErrorId の要素へ scrollIntoView + focus
  return;
}
// 入力変更時（handleChange 内）
clearField(name); // その欄のエラーだけ消す。全体の再検証はしない
```

- `validate(schema, data)`: `validateForm` を呼び、FieldErrors を state に保存。true/false を返す
- `clearField(name)`: 該当キーを削除（「編集したら叱られが消える」を保証）
- ラベル辞書は各フォームの既存 `fieldLabels` を渡す（サマリー表示用）
- **手書き Zod スキーマは引き続き禁止**。スキーマは必ず `generated/zod/**` を使う

**FieldError / 入力欄の装飾**:

- エラー文: `text-sm text-red-600`、`id="{field}-error"`
- 入力: `aria-invalid={true}` + 赤ボーダー（`border-red-400`）+ 薄赤背景（`bg-red-50/60`）
  + `aria-describedby="{field}-error"`
- `Field` ラッパーがあるフォームは `error?: string` prop を追加して内部で表示。
  ラッパーの無いフォーム（企業登録など）は `FieldError` を input 直下に置く

**ErrorSummary**（企業プロフィール・求人など長フォーム用）:

- 「入力内容に N 件の問題があります」＋ 各エラーの「ラベル: メッセージ」リスト
- 各行はアンカー（`href="#field-id"` 相当の scrollIntoView + focus）
- 求人編集の既存 `missingRequired` バナー（公開必須の未入力一覧）と**見た目を揃えて隣接配置**する
  （必須未入力=ドメインルール、zod=スキーマ制約という役割分担は維持。統合はしない）

### 3-2. 検証タイミングの規約

| タイミング | 動作 |
|---|---|
| 送信ボタン押下 | `validate()` で全件検証 → エラーなら送信中断、サマリー表示＋最初のエラー欄へスクロール＆フォーカス |
| エラー表示後の入力変更 | `clearField(name)` でその欄のエラーのみ消す（再検証はしない） |
| blur | 今回はやらない（将来拡張。やるなら「初回送信後のみ blur 再検証」方式） |
| 入力中（タイプごと） | やらない |

### 3-3. トースト・単一文字列からの移行

- トースト（企業プロフィール・求人編集）: バリデーションエラーではトーストを出さず、
  サマリー＋インラインに置き換える。**API エラー（サーバ 4xx/5xx）は従来どおりトースト**。
- 単一文字列フォーム: `error: string` state を `fieldErrors` に置き換え。
  API エラー用に `submitError: string` は残す（検証エラーと混ぜない）。

### 3-4. 文字数カウンタ・maxLength の生成定数化（同時に直す）

orval は制約値を定数としても生成している（例:
`companyProfilesUpdateCompanyProfileBodyDescriptionMax = 10000`）。現状 UI のヒントは
手書きで **spec と食い違っている箇所がある**（企業プロフィールの headline ヒント
`/100` に対し spec は 255、description ヒント `/2000` に対し spec は 10000）。

- カウンタ表示（`{form.description.length}/2000` 等）と HTML `maxLength` 属性を
  生成定数から取るように置き換え、手書き数値を撤去する
- どちらの値が正か（UI の意図が 100 なら TypeSpec 側を 100 に絞る）は実装時に判断し、
  **spec を単一ソースにする**

## 4. 適用フェーズ（1フェーズ = 1コミット、都度 tsc / biome / 実ブラウザ確認）

| フェーズ | 対象 | 内容 |
|---|---|---|
| A | 共通部品 + 企業プロフィール編集 | useFieldErrors / FieldError / ErrorSummary を新設し、最も効果の大きい19フィールドフォームで参照実装。Field ラッパーに error prop 追加。カウンタ定数化もここで |
| B | 求人作成・編集 | WYSIWYG 風フォーム（Field ラッパー無し・716行）のため、主要入力に id を振って anchoring。missingRequired バナーと並ぶ ErrorSummary。新規/編集両ページ |
| C | 企業登録 + スカウト系 | 生 label+input 構成に FieldError 直置き。テンプレート new/[id] も |
| D | signup / setup / 記事 | 2〜3 フィールドの小型フォーム。ErrorSummary 不要、インラインのみ |
| E | 小型ダイアログの新規接続 | 応募（ApplyJobRequest）・面接日程調整・チーム作成/編集・スカウト返信に validateForm 接続＋インライン表示（Phase 4 で未接続だったもの）。プロフィールカード群はラッパー層 throw 方式からフォーム側検証に切り替えるか実装時に判断 |

## 5. テスト計画

- vitest: `useFieldErrors`（validate → clearField → 再 validate の状態遷移）、
  `validateForm` / `formatFieldErrors`（Phase 4 で未追加だった単体テスト）
- e2e（Playwright、既存 e2e/ 流儀で1本）: 企業プロフィール編集で文字数超過 →
  インラインエラー表示 → 修正 → エラー消滅 → 保存成功、の一連
- 実ブラウザスモーク: 各フェーズ完了時に対象フォームで「エラー表示 → スクロール →
  編集でクリア」を目視確認

## 6. スコープ外

- react-hook-form / TanStack Form 等のフォームライブラリ導入（現状の useState 手管理で
  成立しており、導入コストに見合わない。将来フォームが更に複雑化したら再検討）
- blur / リアルタイム検証（§3-2 のとおり将来拡張）
- レスポンス検証・admin ページ・ログインフォーム（ロードマップの整理どおり）
- サーバエラー（4xx/5xx）のフィールドマッピング（バックエンドの OpenAPI 検証MWは
  フィールド情報を返すが、正常系では zod が先に止めるため優先度低）

## 7. 未決事項（→ 実装時の判断結果）

| # | 項目 | 判断結果 |
|---|---|---|
| 1 | headline/description のカウンタ値の正 | **spec の 255/10000 を採用**（Phase A）。バックエンド・DB 変更不要で既存データを壊さない。カウンタ・maxLength は生成定数から取得 |
| 2 | プロフィールカード群をフォーム側検証に切り替えるか | **現状のラッパー層 throw を維持**（Phase E）。モーダル群が多数でスキーマ制約も薄く、切替の費用対効果が低い。将来フォームが複雑化したら再検討 |
| 3 | 求人フォームの WYSIWYG 入力へのエラー装飾 | **id 付与＋`aria-invalid:` Tailwind バリアント＋直下 FieldError** で対応（Phase B）。インライン部品（InlineInput 等）に id/error prop を追加 |

補足（Phase E）: 応募（ApplyJobRequest）はユーザー入力フィールドが UI に無い
（jobPostingId のみ送信）ため validateForm 接続は不要と判断し、対象から外した。

## 8. 実施記録

Phase A〜E すべて実装済み（2026-07-18、1フェーズ=1コミット）。
共通部品は `frontend/src/components/form/`（useFieldErrors / FieldError / ErrorSummary）。
スキーマ外のドメインルール（必須チェック・パスワード照合）は `setErrors` でインライン表示に統合。
e2e は `e2e/profile-edit-inline-validation.spec.ts` / `e2e/job-form-inline-validation.spec.ts`。

## 参考

- https://www.nngroup.com/articles/errors-forms-design-guidelines/
- https://www.nngroup.com/articles/error-message-guidelines/
- https://design-system.service.gov.uk/components/error-message/
- https://design-system.service.gov.uk/components/error-summary/
