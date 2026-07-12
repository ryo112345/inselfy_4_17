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
