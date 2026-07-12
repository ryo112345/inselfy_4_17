# Terraform 本体・プロバイダ・state の置き場所。
# state は GCS（バージョニング有効）に置く。ローカルには残さない。
terraform {
  required_version = ">= 1.7" # import ブロックの for_each を使うため

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    bucket = "inselfy-tfstate"
    prefix = "prod"
  }
}
