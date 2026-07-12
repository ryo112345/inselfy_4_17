# CI（terraform-ci.yml）が plan / ドリフト検査に使う read-only SA。
# deploy 用 SA（github-deployer）に読み権限を足して肥大化させず、役割を分離する。
# 書き込めるのは state バケットのオブジェクトだけ（lock ファイルの作成に必要）。
resource "google_service_account" "terraform_planner" {
  account_id   = "terraform-planner"
  display_name = "Terraform plan (CI drift check, read-only)"
}

# GitHub Actions（該当リポジトリのみ）がこの SA を借用できるようにする
resource "google_service_account_iam_member" "planner_wif" {
  service_account_id = google_service_account.terraform_planner.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${local.github_repo}"
}

# ローカルから planner の権限で plan を検証するため、owner に借用を許可
resource "google_service_account_iam_member" "owner_impersonates_planner" {
  service_account_id = google_service_account.terraform_planner.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "user:ryo.akiyama112345@gmail.com"
}

# リソースの読み取り: viewer + IAM ポリシー読み取り（securityReviewer）
resource "google_project_iam_member" "planner_viewer" {
  project = local.project_id
  role    = "roles/viewer"
  member  = "serviceAccount:${google_service_account.terraform_planner.email}"
}

# provider の user_project_override（quota project 経由のリクエスト）に必要
resource "google_project_iam_member" "planner_serviceusage" {
  project = local.project_id
  role    = "roles/serviceusage.serviceUsageConsumer"
  member  = "serviceAccount:${google_service_account.terraform_planner.email}"
}

resource "google_project_iam_member" "planner_security_reviewer" {
  project = local.project_id
  role    = "roles/iam.securityReviewer"
  member  = "serviceAccount:${google_service_account.terraform_planner.email}"
}

# 予算はプロジェクトではなく請求アカウント側の権限が必要
resource "google_billing_account_iam_member" "planner_billing_viewer" {
  billing_account_id = local.billing_account
  role               = "roles/billing.viewer"
  member             = "serviceAccount:${google_service_account.terraform_planner.email}"
}

# state の読み取りと lock オブジェクトの作成・削除
resource "google_storage_bucket_iam_member" "planner_state_objects" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.terraform_planner.email}"
}

resource "google_storage_bucket_iam_member" "planner_state_bucket_read" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.legacyBucketReader"
  member = "serviceAccount:${google_service_account.terraform_planner.email}"
}
