# プロジェクト全体で使う定数。ここに書いてある値が「正」で、
# deploy.yml の env（WIF_PROVIDER / DEPLOYER_SA 等）はこの outputs と一致させる。
locals {
  project_id     = "inselfy"
  project_number = "943028700787"
  region         = "asia-northeast1"

  # CD（GitHub Actions OIDC）を許可するリポジトリ
  github_repo = "ryo112345/inselfy_4_17"

  # デプロイ用 SA と Cloud Run 実行時 SA（デフォルト compute SA）
  deployer_email = "github-deployer@${local.project_id}.iam.gserviceaccount.com"
  runtime_sa     = "${local.project_number}-compute@developer.gserviceaccount.com"

  billing_account = "01DACA-A05029-A05C4A"
}

provider "google" {
  project = local.project_id
  region  = local.region

  # billingbudgets API はユーザー認証だと quota project の指定が必須
  user_project_override = true
  billing_project       = local.project_id
}
