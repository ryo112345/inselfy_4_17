# アプリの画像ストレージ（backend/internal/adapter/gateway/storage/r2.go が使用）。
# 配信は r2.dev の public URL（Cloud Run env の R2_PUBLIC_URL）。
resource "cloudflare_r2_bucket" "uploads" {
  account_id = local.account_id
  name       = "inselfy-uploads"
  location   = "APAC"
}

import {
  to = cloudflare_r2_bucket.uploads
  id = "${local.account_id}/inselfy-uploads/default"
}

# 非公開ファイル（職務経歴書PDF等）。public dev URL は有効化しない —
# R2 バケットはデフォルト非公開のため、読み書きは S3 API（認証付き）のみ。
# アプリ側は Cloud Run env の R2_PRIVATE_BUCKET（deploy.yml 管轄）で参照する。
resource "cloudflare_r2_bucket" "private" {
  account_id = local.account_id
  name       = "inselfy-private"
  location   = "APAC"
}
