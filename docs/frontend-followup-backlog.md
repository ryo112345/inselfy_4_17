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

**現状:** `next build` がビルド時に fonts.gstatic.com から Noto Sans JP（サブセット
woff2 約100ファイル）を取得する（`src/app/layout.tsx` の `next/font/google`）。
ネットワーク不調でビルドごと失敗する（2026-07-19 のローカル Docker で頻発。
CI でも起こり得る flake 源）。

**対策案（どちらか）:**
- `@fontsource-variable/noto-sans-jp` を npm 依存に追加し layout で CSS import
  （サブセット・unicode-range は fontsource が管理。ビルド時ネットワーク不要になる）
- `next/font/local` + リポジトリに woff2 を同梱（next/font の最適化は維持されるが
  サブセット管理が手間）

**検証:** 差し替え後にネットワーク遮断で `next build` が通ること、フォント表示・
FOUT/preload 挙動が変わらないこと、First Load JS への影響を確認。

## 5. CI/CD 続き（2026-07-19 提案の未実施分）

1. **vitest カバレッジ + octocov** — frontend-ci.yml に `--coverage` を足し、
   バックエンドと同じ octocov で PR 差分表示（ゲート化はしない）
2. **バンドルサイズ差分の PR コメント** — `next build` は CI 済みなので
   nextjs-bundle-analysis 等で First Load JS の差分を出す（Dependabot 週次更新の判断材料）
3. **Lighthouse CI** — deploy.yml の candidate タグ URL（本番同等・トラフィック0%）に対して
   performance / accessibility バジェットを実行
4. **frontend-e2e.yml のゲート昇格判断** — nightly で数週間安定したら deploy.yml の
   `needs` に追加してデプロイゲート化する（現状は非ブロッキング）
