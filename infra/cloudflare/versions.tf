# Cloudflare (R2 / DNS) の IaC。GCP とはルートモジュールを分離している:
# GCP 側は WIF で完全キーレスだが、Cloudflare は API トークンが必須のため、
# 認証境界ごと state を分けて「トークンが無くても GCP 側の plan は回る」状態を保つ。
terraform {
  required_version = ">= 1.7"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "inselfy-tfstate"
    prefix = "cloudflare"
  }
}

# 認証は環境変数 CLOUDFLARE_API_TOKEN で渡す（コードにトークンを書かない）
provider "cloudflare" {}

locals {
  account_id = "3fb924380437d8136e9079f0f5598ce8"
}
