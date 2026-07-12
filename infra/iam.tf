# デプロイ用 SA とその最小権限。
# 注意: IAM は authoritative な *_policy ではなく *_member で管理する。
# Google 管理のサービスエージェント（*-serviceAgent 等）や
# デフォルト compute SA の editor ロールを誤って剥がさないため。
resource "google_service_account" "github_deployer" {
  account_id   = "github-deployer"
  display_name = "GitHub Actions deployer (C10)"
}

# GitHub Actions（該当リポジトリのみ）がこの SA を借用できるようにする
resource "google_service_account_iam_member" "deployer_wif" {
  service_account_id = google_service_account.github_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${local.github_repo}"
}

# Cloud Run のデプロイ権限（admin ではなく developer = 最小権限）
resource "google_project_iam_member" "deployer_run_developer" {
  project = local.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${local.deployer_email}"
}

# デプロイ時にランタイム SA（デフォルト compute SA）を actAs するための権限
resource "google_service_account_iam_member" "deployer_actas_runtime" {
  service_account_id = "projects/${local.project_id}/serviceAccounts/${local.runtime_sa}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${local.deployer_email}"
}
