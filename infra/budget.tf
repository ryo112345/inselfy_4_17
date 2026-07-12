# 月次予算アラート（コスト暴走の早期検知）。50% / 90% / 100% で通知。
# 通知先は課金管理者へのメール（デフォルト）。
resource "google_billing_budget" "monthly" {
  billing_account = local.billing_account
  display_name    = "Monthly Budget Alert"

  budget_filter {
    projects               = ["projects/${local.project_number}"]
    calendar_period        = "MONTH"
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = "JPY"
      units         = "500"
    }
  }

  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 0.9
    spend_basis       = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }
}
