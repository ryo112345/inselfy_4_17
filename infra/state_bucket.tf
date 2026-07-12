# Terraform state 置き場（自分自身を管理する）。
# バージョニング有効: state を壊したときに旧世代から復元できる。
resource "google_storage_bucket" "tfstate" {
  name     = "inselfy-tfstate"
  location = "ASIA-NORTHEAST1"

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }
}
