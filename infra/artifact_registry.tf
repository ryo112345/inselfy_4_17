# コンテナイメージ置き場。イメージタグ = git SHA 12桁（deploy.yml 参照）
resource "google_artifact_registry_repository" "images" {
  repository_id = "inselfy"
  location      = local.region
  format        = "DOCKER"
}

# CD がイメージを push できるように、リポジトリ単位で writer を付与
# （プロジェクト全体の writer にはしない = 最小権限）
resource "google_artifact_registry_repository_iam_member" "deployer_writer" {
  repository = google_artifact_registry_repository.images.name
  location   = local.region
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${local.deployer_email}"
}
