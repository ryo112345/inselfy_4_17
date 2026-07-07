# シークレット漏洩対策（多層防御）

単発のツール導入ではなく「予防 → ブロック → 検知 → 最小化 → 対応」の層で守る。
各層は独立に破られ得る前提で重ねる。

## 層の全体像

| 層 | 手段 | 状態 |
|----|------|------|
| 1. 予防（コミット前） | lefthook + gitleaks の pre-commit hook | 導入済み（`lefthook.yml`） |
| 2. ブロック（push時） | ① lefthook + gitleaks の **pre-push hook**（ローカル側の無料近似） / ② GitHub Secret scanning + Push protection（サーバ側） | ① 導入済み（`lefthook.yml`。`--no-verify` コミットや pre-commit の fail-open をすり抜けた分を push 直前に捕まえる） / ② **未設定**（private リポジトリは Secret Protection 課金・$19/committer/月 が必要。public 化すれば無料なので、その時に Settings → Code security で ON にする） |
| 3. 検知（CI） | gitleaks で**全履歴**スキャン（`security.yml`、週次も実行） | 導入済み |
| 4. 最小化（そもそも持たない） | CI の値は GitHub Actions Secrets、GCP 認証は OIDC フェデレーション（長期キーを保存しない） | **導入済み**（C10。WIF + `github-deployer` SA。CD 用のシークレットは GitHub に一切無し。DB パスワードも OIDC 認証後に Secret Manager から取得。`docs/cd-rollback.md`） |
| 5. 対応（漏れた後） | 下記ランブック | 文書化済み |

## セットアップ（各開発者、初回のみ）

```bash
go install github.com/evilmartians/lefthook@latest
go install github.com/zricethezav/gitleaks/v8@v8.30.1
lefthook install   # .git/hooks に pre-commit / pre-push を配線
```

**注意: `$(go env GOPATH)/bin`（通常 `~/go/bin`）が PATH に必要。** 無いと lefthook の hook は
「Can't find lefthook in PATH」と警告するだけで**素通しする（fail-open）**。そもそも pre-commit /
pre-push は `--no-verify` で誰でも回避できる補助層であり、強制層はあくまで CI の gitleaks（層3）という設計。

pre-push の検出パターン上の限界も把握しておく（2026-07-07 実測）: gitleaks は
「既知プレフィックスのトークン（`ghp_` 等）＋高エントロピー値」を捕まえる仕組みで、
AWS の**アクセスキー ID 単体**（`AKIA...`）は検出しない（秘密情報は secret key 側で
`generic-api-key` として検出）。既知のサンプルキー（`AKIAIOSFODNN7EXAMPLE` 等）は
allowlist されるため誤検知しないが、検出率 100% の仕組みではない。

```bash
# ~/.zshrc に追加
export PATH="$HOME/go/bin:$PATH"
```

環境変数は `.env.example` をコピーして使う（`.env` はコミット禁止・gitignore 済み）:

```bash
cp .env.example .env
```

## 漏洩時のランブック

**最優先はローテーション（キーの無効化）。履歴から消すことではない。**
コミットを消しても、push 済みなら「漏れた事実」は取り消せない前提で動く。

1. **ローテーション**: 漏れたキーを発行元（GCP / Stripe / Neon / R2 / GitHub）で即座に無効化し、新しいキーを発行する。
2. **影響確認**: 発行元のアクセスログ・監査ログで不正利用の痕跡を確認する。
   GitHub の Push protection をバイパスした履歴があればそれも確認（設定有効化後）。
3. **履歴の掃除（必要な場合のみ）**: 上記が済んでから `git filter-repo` で履歴を書き換え、
   全員に re-clone を依頼する。private かつ確実に未流出と言える場合以外、これは気休めに近い。
4. **再発防止**: gitleaks のルール・allowlist を見直し、なぜ層をすり抜けたかを記録する。

## 過去の監査結果

- 2026-07-05 監査: be9000b（2026-04-17）で `.env` が一度コミットされ、630bd00 で削除された
  履歴がある。中身はローカル開発用ダミー値のみで実害なし・ローテーション不要と判断。
- 2026-07-07: gitleaks で全履歴312コミットをスキャンし、漏洩ゼロを確認。
