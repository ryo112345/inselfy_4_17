# infra — GCP / Cloudflare リソースの IaC (Terraform)

standing infrastructure（土台）を Terraform で管理する。
既存リソースは 2026-07-12 に `import` ブロックで取り込み済み（`imports.tf`）。
state は GCS `gs://inselfy-tfstate`（バージョニング有効）に置く。

ルートモジュールは 2 つに分かれている:

- `infra/`（このディレクトリ）: GCP。認証は WIF / ADC でキーレス
- `infra/cloudflare/`: Cloudflare（R2 / DNS）。`CLOUDFLARE_API_TOKEN` が必要なため、
  認証境界ごと state を分離（prefix `cloudflare`）。トークンが無くても GCP 側は回る

## Terraform と CD (deploy.yml) の管轄分け

| | 管轄 | 例 |
|---|---|---|
| **Terraform** | 土台（standing infrastructure） | Cloud Run サービスの存在・ingress・公開IAM、WIF、SA と最小権限、Secret の入れ物と IAM、Artifact Registry、予算アラート、有効化 API |
| **CD (deploy.yml)** | リリース（リビジョン） | イメージ、env、シークレット参照、probe、max-instances、トラフィック切替 |

CD が毎デプロイでリビジョンテンプレートを上書きするため、`google_cloud_run_v2_service` の
`template` / `traffic` / `scaling` は `ignore_changes` で Terraform 管理外にしている。
**env や probe を変えたいときは deploy.yml を編集する**（ここではない）。

## 実行方法

```bash
# 認証（初回のみ。gcloud 本体のログインとは別物）
gcloud auth application-default login

cd infra
terraform init
terraform plan   # 差分確認（コンソール手動変更のドリフト検知を兼ねる）
terraform apply
```

ADC を設定していない場合は一時トークンでも動く:
`GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token) terraform plan`

## 意図的に管理していないもの

- **シークレットの値**: state に平文で残るため入れ物と IAM のみ管理。
  値の登録は `gcloud secrets versions add`
- **デフォルト compute SA の `roles/editor`**: Google のデフォルト付与。
  剥がすならランタイム専用 SA への移行とセット（将来課題）
- **`inselfy_cloudbuild` バケット**: Cloud Build の自動生成物で未使用
- **BigQuery 系などデフォルト有効の API**: 意図して使う API のみ `apis.tf` に列挙
- **Neon**: 別プロバイダ。必要になったら追加する

## Cloudflare（infra/cloudflare/）

R2 バケット `inselfy-uploads` を管理（import 済み）。DNS ゾーンは現在
Cloudflare 上に存在しない（カスタムドメイン未使用）ので対象外。

```bash
export CLOUDFLARE_API_TOKEN=...   # ~/.zshrc に保存済み（R2編集 + DNS編集 + ゾーン読取）
cd infra/cloudflare
terraform init && terraform plan
```

CI ではこのディレクトリを対象にしない（長期クレデンシャルを GitHub に置かない方針を
GCP 側と揃えるため。リソースが増えて必要になったら secret 追加を検討）。

## CI（terraform-ci.yml）

- **PR（infra/ 変更時）**: fmt / validate / plan。plan 結果は job summary に出る。
  **apply は自動化しない** — 人間が plan を読んでからローカルで適用する
- **週次**: `plan -detailed-exitcode` でドリフト検査。コンソール手動変更や
  未適用の変更があると fail する（スキーマドリフト検査と同じ思想）
- 認証は WIF キーレス。SA は read-only の `terraform-planner`
  （viewer + securityReviewer + billing.viewer + state バケットの objectAdmin のみ。
  deploy 用 SA とは分離）

## 注意

- IAM は authoritative な `*_policy` ではなく `*_member` で管理している。
  Google 管理のサービスエージェントの binding を誤って剥がさないため
- `deletion_protection = true`（Cloud Run）: `terraform destroy` からサービスを保護
- deploy.yml の `WIF_PROVIDER` / `DEPLOYER_SA` は `terraform output` の値と一致させること
