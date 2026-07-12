# 外形監視: 本番が落ちたらメールで気づける仕組み。
#
# 監視対象は /api/healthz（プロセス liveness、DB を見ない）。
# /api/readyz（DB ping 込み）にしないのは意図的: 外形監視が数分おきに DB を
# 叩き続けると Neon がサスペンドできず、無料枠の compute 時間を使い切るため。
# チェック量は 6 checker × 5分間隔 ≈ 5万回/月で無料枠（100万回/月）内。
resource "google_monitoring_uptime_check_config" "healthz" {
  display_name = "inselfy healthz"
  timeout      = "10s"
  period       = "300s" # 5分間隔（十分な検知速度とチェック量のバランス）

  http_check {
    path         = "/api/healthz"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = local.project_id
      host       = "inselfy-2x4xavv5gq-an.a.run.app"
    }
  }
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Owner email"
  type         = "email"

  labels = {
    email_address = "ryo.akiyama112345@gmail.com"
  }
}

# uptime check の失敗が 10 分続いたら通知（単発の flap では鳴らさない）
resource "google_monitoring_alert_policy" "uptime" {
  display_name = "inselfy uptime failure"
  combiner     = "OR"

  conditions {
    display_name = "healthz uptime check failing"

    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.healthz.uptime_check_id}\" AND resource.type=\"uptime_url\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "600s"

      aggregations {
        alignment_period     = "1200s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.project_id", "resource.label.host"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
}
