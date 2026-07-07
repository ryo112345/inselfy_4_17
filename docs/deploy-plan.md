# デプロイ実装計画

## 構成

| 役割 | サービス | 備考 |
|---|---|---|
| アプリ | Cloud Run | 無料枠内 |
| DB | Neon (PostgreSQL + pgvector) | 無料枠（0.5GB） |
| 画像ストレージ | Cloudflare R2 | 無料枠（10GB） |
| コンテナレジストリ | Artifact Registry | 無料枠内 |
| ビルド | Cloud Build | 毎日120分まで無料 |

---

## Phase 1: インフラ準備（ブラウザ操作）

### 1-1. Neon

- [ ] https://neon.tech でアカウント作成
- [ ] プロジェクト作成（リージョン: Asia Pacific - Tokyo）
- [ ] 接続情報を控える（host, user, password, database）
- [ ] pgvector 拡張を有効化: `CREATE EXTENSION IF NOT EXISTS vector;`

### 1-2. Cloudflare R2

- [ ] https://dash.cloudflare.com でアカウント作成
- [ ] R2 バケット作成（名前: `inselfy-uploads`、リージョン: APAC）
- [ ] API トークン作成（R2の読み書き権限）
- [ ] 公開アクセス設定（画像配信用にパブリックバケットURLまたはカスタムドメインを設定）
- [ ] アクセスキーID・シークレットアクセスキー・エンドポイントURLを控える

### 1-3. GCP

- [ ] プロジェクト作成（または既存プロジェクトを使用）
- [ ] 必要なAPIを有効化:
  - Cloud Run Admin API
  - Cloud Build API
  - Artifact Registry API
  - Secret Manager API
- [ ] Artifact Registry にリポジトリ作成:
  ```bash
  gcloud artifacts repositories create inselfy \
    --repository-format=docker \
    --location=asia-northeast1
  ```
- [ ] 予算アラート設定（$1で通知）

---

## Phase 2: コード変更

### 2-1. R2 ストレージアダプタの追加

既存の `FileStorage` インターフェース（`backend/internal/port/storage_port.go`）に対して、
R2用のアダプタを新規作成する。R2はS3互換APIなので AWS SDK の S3 クライアントを使用。

**新規ファイル:** `backend/internal/adapter/gateway/storage/r2.go`

```go
// S3互換APIでR2に接続
// 必要な設定: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
```

**変更ファイル:** `backend/internal/driver/config/config.go`
- R2 用の環境変数フィールドを追加（`StorageBackend` は既に "local" / "gcs" の切り替えがあるので "r2" を追加）

```go
// 追加するフィールド
R2AccountID       string `env:"R2_ACCOUNT_ID" envDefault:""`
R2AccessKeyID     string `env:"R2_ACCESS_KEY_ID" envDefault:""`
R2SecretAccessKey string `env:"R2_SECRET_ACCESS_KEY" envDefault:""`
R2Bucket          string `env:"R2_BUCKET" envDefault:""`
R2PublicURL       string `env:"R2_PUBLIC_URL" envDefault:""`
```

**変更ファイル:** `backend/internal/driver/initializer/api/initializer.go`
- `StorageBackend` の値に応じて Local / R2 を切り替えるロジックを追加

### 2-2. 画像アップロードハンドラの確認

以下のハンドラは `FileStorage` インターフェース経由 or 直接ファイル書き込みしている。
直接書き込みしている箇所は `FileStorage` 経由に統一する必要がある。

| ハンドラ | ファイル | 現在の方式 |
|---|---|---|
| 記事画像 | `article_controller.go` | FileStorage 経由 ✅ |
| 求人画像（チームメンバー/ギャラリー/カバー） | `job_posting_controller.go` | 直接 os.Create ⚠️ |
| 企業プロフィール画像 | `company_profile_controller.go` | 直接 os.Create ⚠️ |

→ `job_posting_controller.go` と `company_profile_controller.go` の画像保存を `FileStorage` 経由に修正

### 2-3. DB接続設定の修正

**変更ファイル:** `backend/internal/driver/config/config.go`
- Neonへの接続には SSL が必須。`DatabaseURL()` の `sslmode=disable` を環境変数で切り替え可能にする

```go
// 追加フィールド
DBSSLMode string `env:"DB_SSLMODE" envDefault:"disable"`

// DatabaseURL() を修正
func (c *Config) DatabaseURL() string {
    return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
        c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode)
}
```

### 2-4. 本番用URL設定

以下のハードコードされたURLを環境変数化する:

| 箇所 | 現在の値 | 環境変数 |
|---|---|---|
| Stripe リダイレクト | `http://localhost:5173` | `APP_URL` |
| LINE リダイレクト | `http://localhost:5173/auth/callback` | 既に `LINE_REDIRECT_URI` あり ✅ |

---

## Phase 3: デプロイ設定

### 3-1. Secret Manager にシークレットを登録

```bash
# 各シークレットを登録
gcloud secrets create db-user --data-file=-
gcloud secrets create db-password --data-file=-
gcloud secrets create jwt-secret --data-file=-
gcloud secrets create line-channel-id --data-file=-
gcloud secrets create line-channel-secret --data-file=-
gcloud secrets create google-client-id --data-file=-
gcloud secrets create stripe-secret-key --data-file=-
gcloud secrets create stripe-webhook-secret --data-file=-
gcloud secrets create r2-access-key-id --data-file=-
gcloud secrets create r2-secret-access-key --data-file=-
gcloud secrets create admin-api-key --data-file=-
```

### 3-2. cloudbuild.yaml を更新

Cloud Run デプロイ時に環境変数・シークレットを設定する:

```yaml
# deploy ステップに追加
- '--set-env-vars'
- 'DB_HOST=ep-xxx.ap-southeast-1.aws.neon.tech,DB_PORT=5432,DB_NAME=neondb,DB_SSLMODE=require,STORAGE_BACKEND=r2,R2_BUCKET=inselfy-uploads,...'
- '--set-secrets'
- 'DB_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest,...'
```

### 3-3. Neon にマイグレーション実行

ローカルから Neon に対してマイグレーションを実行:

```bash
# Neon の接続情報を使用
export DATABASE_URL="postgres://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
cd backend && make migrate-up
```

---

## Phase 4: デプロイ実行

### 4-1. デプロイ（通常: main にマージするだけ）

デプロイは C10 で GitHub Actions の CD に移行済み（`.github/workflows/deploy.yml`）。
**main にマージすると CI ゲート → キーレス(OIDC)デプロイまで自動で走る。**
env vars / secrets 設定の正も deploy.yml に移った（cloudbuild.yaml は廃止）。
パイプラインの全体像・ロールバック手順・マイグレーション規律は `docs/cd-rollback.md`。

### 4-1b. 緊急手動デプロイ（GitHub Actions 障害時のみ）

```bash
# クリーンな作業ツリー（git status が clean）・main の HEAD で実行すること。
# イメージタグ = git SHA なので、未コミット変更が混ざるとタグと中身がズレる。
TAG=$(git rev-parse --short=12 HEAD)
IMAGE="asia-northeast1-docker.pkg.dev/inselfy/inselfy/inselfy:${TAG}"
gcloud auth configure-docker asia-northeast1-docker.pkg.dev --quiet
docker build --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=943028700787-o7mad2o995vm6q7f3q5gg6avusrfds79.apps.googleusercontent.com -t "$IMAGE" .
docker push "$IMAGE"
# migrate（deploy.yml と同じ direct エンドポイント。パスワードは Secret Manager から）
migrate -path backend/migrations -database "postgres://neondb_owner:$(gcloud secrets versions access latest --secret=db-password)@ep-super-pine-aohjguv8.c-2.ap-southeast-1.aws.neon.tech:5432/neondb?sslmode=require" up
# 2段階デプロイ（env/secrets/probe のフラグは deploy.yml の Deploy revision ステップから丸ごとコピーする）
gcloud run deploy inselfy --image "$IMAGE" --region asia-northeast1 --no-traffic --tag candidate ...
curl -fsS "https://candidate---inselfy-2x4xavv5gq-an.a.run.app/api/readyz"
gcloud run services update-traffic inselfy --region asia-northeast1 --to-latest
```

イメージタグは git SHA に統一している（`latest` は使わない）。Cloud Run のリビジョン →
イメージタグ → コミットが一意に辿れる。

### 4-2. 動作確認

- [ ] Cloud Run のURL（`https://inselfy-xxx.run.app`）にアクセスしてフロントが表示される
- [ ] ログイン（Google OAuth / LINE）が動作する
- [ ] 画像アップロードがR2に保存される
- [ ] DBへの読み書きが正常に動作する

---

## 実装順序まとめ

| 順番 | タスク | 種類 |
|---|---|---|
| 1 | Neon / Cloudflare R2 / GCP のセットアップ | ブラウザ操作 |
| 2 | R2 ストレージアダプタの実装 | コード変更 |
| 3 | 画像ハンドラを FileStorage 経由に統一 | コード変更 |
| 4 | DB接続の SSL 対応 | コード変更 |
| 5 | ハードコードURL の環境変数化 | コード変更 |
| 6 | cloudbuild.yaml の更新 | 設定変更 |
| 7 | Secret Manager 登録 + マイグレーション | インフラ操作 |
| 8 | デプロイ + 動作確認 | デプロイ |
