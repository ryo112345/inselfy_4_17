# deploy.yml の env（WIF_PROVIDER / DEPLOYER_SA）はこの値と一致させること
output "wif_provider" {
  value       = google_iam_workload_identity_pool_provider.github_oidc.name
  description = "deploy.yml の WIF_PROVIDER に設定する値"
}

output "deployer_sa" {
  value       = google_service_account.github_deployer.email
  description = "deploy.yml の DEPLOYER_SA に設定する値"
}

output "service_url" {
  value       = google_cloud_run_v2_service.app.uri
  description = "Cloud Run サービスの URL"
}
