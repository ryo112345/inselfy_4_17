# 既存リソースの import 定義。
# すべて import 済みになったらこのファイルは削除してよい（残しても害はない）。
import {
  to = google_cloud_run_v2_service.app
  id = "projects/${local.project_id}/locations/${local.region}/services/inselfy"
}

import {
  to = google_cloud_run_v2_service_iam_member.public_invoker
  id = "projects/${local.project_id}/locations/${local.region}/services/inselfy roles/run.invoker allUsers"
}

import {
  to = google_artifact_registry_repository.images
  id = "projects/${local.project_id}/locations/${local.region}/repositories/inselfy"
}

import {
  to = google_artifact_registry_repository_iam_member.deployer_writer
  id = "projects/${local.project_id}/locations/${local.region}/repositories/inselfy roles/artifactregistry.writer serviceAccount:${local.deployer_email}"
}

import {
  to = google_service_account.github_deployer
  id = "projects/${local.project_id}/serviceAccounts/${local.deployer_email}"
}

import {
  to = google_service_account_iam_member.deployer_wif
  id = "projects/${local.project_id}/serviceAccounts/${local.deployer_email} roles/iam.workloadIdentityUser principalSet://iam.googleapis.com/projects/${local.project_number}/locations/global/workloadIdentityPools/github/attribute.repository/${local.github_repo}"
}

import {
  to = google_service_account_iam_member.deployer_actas_runtime
  id = "projects/${local.project_id}/serviceAccounts/${local.runtime_sa} roles/iam.serviceAccountUser serviceAccount:${local.deployer_email}"
}

import {
  to = google_project_iam_member.deployer_run_developer
  id = "${local.project_id} roles/run.developer serviceAccount:${local.deployer_email}"
}

import {
  to = google_iam_workload_identity_pool.github
  id = "projects/${local.project_id}/locations/global/workloadIdentityPools/github"
}

import {
  to = google_iam_workload_identity_pool_provider.github_oidc
  id = "projects/${local.project_id}/locations/global/workloadIdentityPools/github/providers/github-oidc"
}

import {
  for_each = toset(local.app_secrets)
  to       = google_secret_manager_secret.app[each.value]
  id       = "projects/${local.project_id}/secrets/${each.value}"
}

import {
  for_each = toset(local.app_secrets)
  to       = google_secret_manager_secret_iam_member.runtime_accessor[each.value]
  id       = "projects/${local.project_id}/secrets/${each.value} roles/secretmanager.secretAccessor serviceAccount:${local.runtime_sa}"
}

import {
  to = google_secret_manager_secret_iam_member.deployer_db_password
  id = "projects/${local.project_id}/secrets/db-password roles/secretmanager.secretAccessor serviceAccount:${local.deployer_email}"
}

import {
  for_each = toset(local.services)
  to       = google_project_service.enabled[each.value]
  id       = "${local.project_id}/${each.value}"
}

import {
  to = google_billing_budget.monthly
  id = "billingAccounts/${local.billing_account}/budgets/0da9dd5d-7e5b-4cc3-95ae-6fd47feb4659"
}

import {
  to = google_storage_bucket.tfstate
  id = "inselfy-tfstate"
}
