# 意図して使っている API だけを管理する（BigQuery 系などデフォルト有効のものは対象外）。
# disable_on_destroy = false: terraform destroy で API まで無効化して
# 他リソースを巻き込む事故を防ぐ。
locals {
  services = [
    "run.googleapis.com",                  # Cloud Run
    "artifactregistry.googleapis.com",     # コンテナイメージ置き場
    "secretmanager.googleapis.com",        # アプリのシークレット
    "iam.googleapis.com",                  # SA・IAM
    "iamcredentials.googleapis.com",       # WIF のトークン交換
    "sts.googleapis.com",                  # WIF のトークン交換
    "billingbudgets.googleapis.com",       # 予算アラート
    "monitoring.googleapis.com",           # Cloud Monitoring
    "logging.googleapis.com",              # Cloud Logging
    "storage.googleapis.com",              # GCS（tfstate バケット）
    "cloudresourcemanager.googleapis.com", # Terraform が project IAM / API を管理するのに必要
    "cloudbilling.googleapis.com",         # Terraform が請求アカウントの IAM（planner の billing.viewer）を管理するのに必要
  ]
}

resource "google_project_service" "enabled" {
  for_each = toset(local.services)

  service            = each.value
  disable_on_destroy = false
}
