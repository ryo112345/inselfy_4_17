# フロント残タスク バックログ（死にリンク解消・法務ページ・CI/CD 続き）

2026-07-19 の frontend e2e CI 導入（`.github/workflows/frontend-e2e.yml`）の際に発覚した
未解決項目のバックログ。発覚の経緯: 本番ビルドの Next.js はビューポート内リンクを
RSC プリフェッチするが、**存在しないルートへのプリフェッチは永遠に完了せず**、
e2e の `networkidle` 待ちが全滅した（14/21 失敗 → 死にリンク5本のスタブ化で 21/21 green）。
死にリンクの機械的な棚卸しは以下で再実行できる:

```bash
cd frontend
{ grep -rhoE 'href="/[a-z0-9_/-]*"' src --include="*.tsx"; \
  grep -rhoE 'href: "/[a-z0-9_/-]*"' src --include="*.tsx" --include="*.ts"; } \
  | grep -oE '"/[a-z0-9_/-]*"' | tr -d '"' | sort -u \
  | while read -r h; do \
      find "src/app$h" -maxdepth 1 -name "page.tsx" 2>/dev/null | grep -q . || echo "DEAD: $h"; \
    done
# 注意: /company/jobs/1 等は動的ルート [jobId] に一致するので誤検知。目視で除外する
```

---

## 1. 利用規約 `/terms`・プライバシーポリシー `/privacy` の作成（優先: 高）

**ステータス (2026-07-19): ページ実装済み・本文はユーザーレビュー待ち。**
実装事実の調査で判明した注意点: 診断結果・AIレポートの閲覧はログイン済み利用者全員に
許可されている（本人限定ではない）ため、ポリシー第3条にその旨を明記した。
候補者の自己退会エンドポイントは未実装のため、退会は「窓口への申し出」と記載した。
問い合わせ窓口の具体的な連絡先（メールアドレス等）は未定のままプレースホルダ表記。

**現状:** LandingPage（`src/app/components/LandingPage.tsx`）のフッターからリンクされているが
ページが存在せず 404。素の `<a>` タグなのでプリフェッチハングは起きないが、
職務経歴書・診断結果という個人情報を扱うサービスとして、プライバシーポリシー不在は
個人情報保護法の「利用目的の公表」義務・Google OAuth の利用条件の観点で本番公開のブロッカー。

**手順:**

1. **実装事実の調査**（ポリシーの正確性に必須。ここを空想で書かない）
   - 企業側に見える候補者情報の範囲: talent-search API が返す項目、診断結果
     （WV/CI）の可視性、承認前の職務経歴書ドラフトが見えないこと、スカウト設定での
     公開制御（scout-settings）
   - 取得する情報の棚卸し: プロフィール・職務経歴書 PDF・診断回答・セッション Cookie・
     Google OAuth プロフィール・LINE 連携（LINE_CHANNEL_ID あり）・Stripe 決済情報
   - 保存先・委託先: Neon (PostgreSQL, シンガポール region)・Cloudflare R2（画像/PDF）・
     Google Cloud Run（東京）
2. **ドラフト作成 → ユーザーレビュー**（法的レビューの代替にならない旨は合意済み）
   - 利用規約: 定義 / アカウント / 禁止事項 / 投稿コンテンツの権利 /
     マッチングにおける免責（雇用契約の当事者にならない）/ 退会 / 規約変更 / 準拠法
   - プライバシーポリシー: 取得情報 / 利用目的（マッチング・スカウト・AIレポート生成）/
     **第三者提供＝候補者情報を企業に見せる範囲**（このサービスの本質なので最重要）/
     外部サービス / 保存期間 / 開示請求窓口
3. **ページ実装**: 静的ページ2枚（`src/app/terms/page.tsx`, `src/app/privacy/page.tsx`）。
   `@tailwindcss/typography` (prose) で十分。改定日を書く

## 2. 管理画面 `/admin/resumes`・`/admin/job-pdfs` の実装 or リンク削除（優先: 中）

**現状:** `/admin` ダッシュボード（`src/app/admin/page.tsx` の 28行目・74行目付近）から
リンクされているが、両ページとも **git 履歴上一度も存在しない**（削除ではなく未実装）。
一方 CLAUDE.md の職務経歴書ワークフローは確認 URL `/admin/resumes/{resumeId}/draft` を、
求人票ワークフローは管理画面 `/admin/job-pdfs` を参照しており、ドキュメントと実装が齟齬。
admin ページは Link プリフェッチ経由のハング源にもなる（e2e は admin を踏まないため現状無害）。

**判断が必要:** 実装する（推奨）か、当面ダッシュボードのリンクを外すか。

**実装する場合:**
- backend API は実在する（`X-Admin-Key` 認証）: `GET /api/admin/resumes?status=` /
  `GET /api/admin/resumes/:id/download` / `PUT .../draft` / 承認（2人承認で本反映、
  cookie 認証必要）。job-pdfs も同様の系がある
- 必要ページ: 一覧（status フィルタ）＋ドラフト確認・編集・承認ページ。
  仕様の一次情報は CLAUDE.md の両ワークフロー
- 実装後、CLAUDE.md 記載の URL（ポート表記が 5173 のままの箇所あり）を実態に合わせて修正

## 3. スタブ5ページの本実装（優先: 低・機能開発）

2026-07-19 に「準備中」スタブ化した5ページ。いずれ本実装するかリンクごと見直す:

| ルート | リンク元 | 備考 |
|---|---|---|
| `/settings` | 候補者 Sidebar「設定」 | アカウント設定（メール・退会等） |
| `/help` | 候補者 Sidebar「ヘルプ」 | FAQ で可 |
| `/bookmarks` | 候補者 Sidebar「気になる」 | 求人ブックマーク機能ごと未実装 |
| `/company/settings` | CompanyHeader「設定」 | company-page-layout 構想メモ参照 |
| `/company/manual` | CompanyHeader「マニュアル」 | 企業向け使い方ガイド |

## 4. フォントのセルフホスト化（優先: 中・CI 安定性）

**ステータス (2026-07-19): 完了。** `next/font/google` を全廃し fontsource
（`@fontsource-variable/noto-sans-jp` / `plus-jakarta-sans` / `inter` /
`playfair-display`）に置換。Noto Sans JP / Plus Jakarta Sans は layout.tsx で
import し `--font-*` 変数で従来どおり参照。診断系5ページの Inter / Playfair は
Tailwind `@theme` の `font-playfair` / `font-inter` ユーティリティに置換。
ビルド時の fonts.gstatic.com 依存はゼロになった。
（トレードオフ: next/font が行っていた latin サブセットの preload は無くなる。
fontsource は font-display: swap + unicode-range の遅延取得）

## 5. CI/CD 続き（2026-07-19 提案分）

1. **vitest カバレッジ + octocov** — **完了 (2026-07-19)。** `@vitest/coverage-v8` +
   `.octocov.frontend.yml`（可視化のみ・ゲートなし。backend と別名 Artifact）
2. **バンドルサイズ差分の PR コメント** — **完了 (2026-07-19)。** Next 16 (Turbopack) は
   per-route サイズ表を出さないため nextjs-bundle-analysis は使えず、
   `frontend/scripts/bundle-size.mjs` で集計値（共有 First Load JS・総 JS/CSS gzip）を
   自前計測。main（deploy run）の Artifact をベースラインに差分コメントを upsert
3. **Lighthouse CI** — **完了 (2026-07-19)。** deploy.yml の candidate 検証後に
   treosh/lighthouse-ci-action で `/` と `/login` を計測。当面 continue-on-error で
   非ブロッキング（数値が安定したらゲート昇格を検討）
4. **frontend-e2e.yml のゲート昇格判断** — **未実施（意図的）。** nightly で数週間
   安定したら deploy.yml の `needs` に追加してデプロイゲート化する（現状は非ブロッキング）
