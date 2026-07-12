# Cloud Run サービス。
#
# 管轄分け（重要）:
#   - Terraform: サービスの存在・ingress・公開 IAM（土台）
#   - deploy.yml (CD): リビジョンテンプレート全体（イメージ・env・シークレット参照・
#     probe・max-instances）とトラフィック切替
# CD が毎デプロイで template を上書きするため、template / traffic は ignore_changes で
# Terraform の管理外にする。env や probe を変えたいときは deploy.yml を編集する。
resource "google_cloud_run_v2_service" "app" {
  name     = "inselfy"
  location = local.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  deletion_protection = true

  # 実体は CD が管理（上記コメント参照）。ここは import を成立させるための最小定義
  template {}

  lifecycle {
    ignore_changes = [
      template,
      traffic,
      scaling, # max-instances は CD がリビジョン側で設定している
      client,
      client_version,
      labels,
      annotations,
    ]
  }
}

# 公開 Web サービスなので未認証アクセスを許可する
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  name     = google_cloud_run_v2_service.app.name
  location = local.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
