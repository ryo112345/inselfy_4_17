# アプリのシークレット。Terraform が管理するのは「入れ物」と IAM だけで、
# 値（バージョン）は絶対に管理しない（state に平文で残るため）。
# 値の登録・ローテーションは gcloud secrets versions add で行う。
locals {
  app_secrets = [
    "db-password",
    "jwt-secret",
    "line-channel-secret",
    "r2-access-key-id",
    "r2-secret-access-key",
    "stripe-secret-key",
  ]

}

resource "google_secret_manager_secret" "app" {
  for_each = toset(local.app_secrets)

  secret_id = each.value

  replication {
    auto {}
  }
}

# ランタイム SA は全シークレットを読める（Cloud Run 起動時に env へ展開するため）
resource "google_secret_manager_secret_iam_member" "runtime_accessor" {
  for_each = toset(local.app_secrets)

  secret_id = google_secret_manager_secret.app[each.value].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.runtime_sa}"
}

# デプロイ SA は db-password だけ読める（deploy.yml のマイグレーション実行で使用）。
# 他のシークレットへのアクセス権は与えない（最小権限）
resource "google_secret_manager_secret_iam_member" "deployer_db_password" {
  secret_id = google_secret_manager_secret.app["db-password"].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.deployer_email}"
}
