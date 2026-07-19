#!/bin/zsh
# wire_admin グループ（admin 21ルート＋共有コントローラの user-facing レポート7ルート。
# admins CRUD / users / companies / WV・CI・統合レポート管理）の前後比較スモーク。
# 使い方・前提は lib.sh のヘッダーを参照。
#
# - WV は seed の pending セッション（yuki_kobayashi、固定ID）にレポートを作成し末尾で行削除
# - CI は既存レポート1件を SQL でスナップショットし、上書きテスト後に復元
# - 統合レポートは taro でリクエストを新規作成し、末尾でレポート・リクエスト行を削除
# - bypass-login 2本は Set-Cookie の名前・属性（値マスク）を .cookies で比較
# - 日時フィールド（created_at 等の snake_case）は echo 時代の手書きフォーマット
#   （ローカル時刻+Z 付与の癖あり）と生成モデル time.Time の直列化が異なるため
#   diff では揮発扱い（意図的微差、docs 参照）
source "${0:A:h}/lib.sh"

TARO_ID="10000000-0000-0000-0000-000000000001"
MISSING="00000000-0000-0000-0000-000000000000"
WV_SID="30004000-0000-0000-0000-000000000001"  # seed の pending WV セッション
SMOKE_EMAIL="smoke-admin-group@example.test"
JARC_UNUSED=""
JART="$OUT/taro_cookies.txt"
K=$(admin_key)

# reqc <name> <curl-args...> — req に加えて Set-Cookie（値マスク・ソート済み）を保存
reqc() {
  local name=$1
  shift
  curl -s -D "$OUT/$name.headers" -o "$OUT/$name.body" -w '%{http_code}' "$@" >"$OUT/$name.status"
  grep -i '^set-cookie:' "$OUT/$name.headers" | tr -d '\r' |
    sed -E 's/^[Ss]et-[Cc]ookie: ([^=]+)=[^;]*/Set-Cookie: \1=MASKED/' |
    sort >"$OUT/$name.cookies"
  rm -f "$OUT/$name.headers"
  printf '%s %s\n' "$(cat "$OUT/$name.status")" "$name"
}

# --- 復旧検証用スナップショット ---
snap() { psql_db "select count(*) from $1"; }
ADMIN_N=$(snap admins)
AIR_N=$(snap ai_reports)
CIR_N=$(snap ci_ai_reports)
INTR_N=$(snap integrated_reports)
INTQ_N=$(snap integrated_report_requests)
CA_N=$(snap company_accounts)
# CI: 復元用に既存レポート1件を退避
CSID=$(psql_db "select session_id from ci_ai_reports order by created_at, id limit 1")
psql_db "create table if not exists smoke_ci_backup as select * from ci_ai_reports where session_id='$CSID'" >/dev/null

# --- セットアップ ---
curl -s -c "$JART" -X POST -H "X-Admin-Key: $K" \
  "$BASE/api/admin/users/$TARO_ID/bypass-login" >/dev/null
curl -s -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"password123\",\"companyName\":\"管理検証株式会社\",\"contactPersonName\":\"検証 太郎\",\"phoneNumber\":\"03-0000-0000\"}" \
  "$BASE/api/company/auth/register" >"$OUT/00_register.body"
CO=$(python3 -c "import json;print(json.load(open('$OUT/00_register.body')).get('id',''))")

# ==================== 管理者 CRUD ====================
req 01_admins_list -H "X-Admin-Key: $K" "$BASE/api/admin/admins"
req 02_admin_create -X POST -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"email":"smoke-admin@example.test","name":"スモーク管理者"}' "$BASE/api/admin/admins"
AID=$(python3 -c "import json;print(json.load(open('$OUT/02_admin_create.body')).get('id',''))")
req 03_admin_create_dup -X POST -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"email":"smoke-admin@example.test","name":"重複"}' "$BASE/api/admin/admins"
req 04_admin_create_bademail -X POST -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"email":"not-an-email","name":"x"}' "$BASE/api/admin/admins"
req 05_admin_issue_key -X POST -H "X-Admin-Key: $K" "$BASE/api/admin/admins/$AID/api-key"
TOKEN=$(python3 -c "import json;print(json.load(open('$OUT/05_admin_issue_key.body')).get('api_key',''))")
req 06_admin_issue_key_missing -X POST -H "X-Admin-Key: $K" "$BASE/api/admin/admins/$MISSING/api-key"
req 07_admins_list_after -H "X-Admin-Key: $K" "$BASE/api/admin/admins"
req 08_use_personal_token -H "X-Admin-Key: $TOKEN" "$BASE/api/admin/users?per_page=1"
req 09_wrong_key -H "X-Admin-Key: admin_0000000000000000000000000000000000000000000000000000000000000000" \
  "$BASE/api/admin/admins"

# ==================== ユーザー管理 ====================
req 10_users_list -H "X-Admin-Key: $K" "$BASE/api/admin/users?per_page=2"
req 11_users_page2 -H "X-Admin-Key: $K" "$BASE/api/admin/users?page=2&per_page=2"
req 12_users_search -H "X-Admin-Key: $K" "$BASE/api/admin/users?q=ryo&per_page=5"
req 13_users_per_page_over -H "X-Admin-Key: $K" "$BASE/api/admin/users?per_page=200"
req 14_user_delete_missing -X DELETE -H "X-Admin-Key: $K" "$BASE/api/admin/users/$MISSING"
reqc 15_user_bypass -X POST -H "X-Admin-Key: $K" "$BASE/api/admin/users/$TARO_ID/bypass-login"
req 16_user_bypass_missing -X POST -H "X-Admin-Key: $K" "$BASE/api/admin/users/$MISSING/bypass-login"

# ==================== 企業管理 ====================
req 17_companies_list -H "X-Admin-Key: $K" "$BASE/api/admin/companies?per_page=2"
req 18_companies_pending -H "X-Admin-Key: $K" "$BASE/api/admin/companies?status=pending&per_page=2"
req 19_company_status_approve -X PATCH -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"status":"approved"}' "$BASE/api/admin/companies/$CO/status"
req 20_company_status_invalid -X PATCH -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"status":"banana"}' "$BASE/api/admin/companies/$CO/status"
req 21_company_status_missing -X PATCH -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"status":"rejected"}' "$BASE/api/admin/companies/$MISSING/status"
reqc 22_company_bypass -X POST -H "X-Admin-Key: $K" "$BASE/api/admin/companies/$CO/bypass-login"
req 23_company_bypass_missing -X POST -H "X-Admin-Key: $K" "$BASE/api/admin/companies/$MISSING/bypass-login"

# ==================== WV レポート ====================
req 25_wv_pending -H "X-Admin-Key: $K" "$BASE/api/admin/reports/pending"
req 26_wv_save -X PUT -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"content":"# スモークレポート\n\nWVレポート本文"}' "$BASE/api/admin/sessions/$WV_SID/ai-report"
req 27_wv_save_empty -X PUT -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"content":""}' "$BASE/api/admin/sessions/$WV_SID/ai-report"
req 28_wv_save_missing -X PUT -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"content":"x"}' "$BASE/api/admin/sessions/$MISSING/ai-report"
req 29_wv_get_admin -H "X-Admin-Key: $K" "$BASE/api/admin/sessions/$WV_SID/ai-report"
req 30_wv_get_admin_again -H "X-Admin-Key: $K" "$BASE/api/admin/sessions/$WV_SID/ai-report"
req 31_wv_reset_viewed -X POST -H "X-Admin-Key: $K" "$BASE/api/admin/sessions/$WV_SID/reset-viewed"
req 32_wv_get_user -b "$JART" "$BASE/api/work-values/sessions/$WV_SID/ai-report"
req 33_wv_get_user_unauth "$BASE/api/work-values/sessions/$WV_SID/ai-report"
req 34_wv_scores -H "X-Admin-Key: $K" "$BASE/api/admin/sessions/$WV_SID/scores"
req 35_wv_scores_missing -H "X-Admin-Key: $K" "$BASE/api/admin/sessions/$MISSING/scores"
req 36_wv_prompt -H "X-Admin-Key: $K" "$BASE/api/admin/sessions/$WV_SID/prompt"
req 37_wv_reports_list -H "X-Admin-Key: $K" "$BASE/api/admin/reports/list"
req 38_wv_pending_after -H "X-Admin-Key: $K" "$BASE/api/admin/reports/pending"

# ==================== CI レポート ====================
req 40_ci_pending -H "X-Admin-Key: $K" "$BASE/api/admin/ci-reports/pending"
req 41_ci_reports_list -H "X-Admin-Key: $K" "$BASE/api/admin/ci-reports/list"
req 42_ci_get -H "X-Admin-Key: $K" "$BASE/api/admin/ci-sessions/$CSID/ai-report"
req 43_ci_get_again -H "X-Admin-Key: $K" "$BASE/api/admin/ci-sessions/$CSID/ai-report"
req 44_ci_save -X PUT -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"content":"# CIスモーク上書き"}' "$BASE/api/admin/ci-sessions/$CSID/ai-report"
req 45_ci_get_after_save -H "X-Admin-Key: $K" "$BASE/api/admin/ci-sessions/$CSID/ai-report"
req 46_ci_reset -X POST -H "X-Admin-Key: $K" "$BASE/api/admin/ci-sessions/$CSID/reset-viewed"
req 47_ci_prompt -H "X-Admin-Key: $K" "$BASE/api/admin/ci-sessions/$CSID/prompt"
req 48_ci_save_missing -X PUT -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"content":"x"}' "$BASE/api/admin/ci-sessions/$MISSING/ai-report"
req 49_ci_get_missing -H "X-Admin-Key: $K" "$BASE/api/admin/ci-sessions/$MISSING/ai-report"
req 50_ci_get_user -b "$JART" "$BASE/api/career-interest/sessions/$CSID/ai-report"

# ==================== 統合レポート ====================
req 55_int_create -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d '{"topic1":1,"topic2":2,"topic3":3,"freeText":"スモーク検証用"}' \
  "$BASE/api/integrated-report/requests"
RID=$(python3 -c "import json;print(json.load(open('$OUT/55_int_create.body')).get('id',''))")
req 56_int_create_dup_topics -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d '{"topic1":1,"topic2":1,"topic3":3,"freeText":""}' "$BASE/api/integrated-report/requests"
req 57_int_status -b "$JART" "$BASE/api/integrated-report/status"
req 58_int_pending_admin -H "X-Admin-Key: $K" "$BASE/api/admin/integrated-reports/pending"
req 59_int_prompt -H "X-Admin-Key: $K" "$BASE/api/admin/integrated-requests/$RID/prompt"
req 60_int_save -X PUT -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"content":"# 統合スモークレポート"}' "$BASE/api/admin/integrated-requests/$RID/ai-report"
req 61_int_get_admin -H "X-Admin-Key: $K" "$BASE/api/admin/integrated-requests/$RID/ai-report"
req 62_int_status_ready -b "$JART" "$BASE/api/integrated-report/status"
req 63_int_me -b "$JART" "$BASE/api/integrated-report/me"
req 64_int_get_user -b "$JART" "$BASE/api/integrated-report/requests/$RID/report"
req 65_int_latest -b "$JART" "$BASE/api/integrated-report/users/$TARO_ID/latest-request"
req 66_int_reset -X POST -H "X-Admin-Key: $K" "$BASE/api/admin/integrated-requests/$RID/reset-viewed"
req 67_int_list -H "X-Admin-Key: $K" "$BASE/api/admin/integrated-reports/list"
req 68_int_save_missing -X PUT -H "X-Admin-Key: $K" -H 'Content-Type: application/json' \
  -d '{"content":"x"}' "$BASE/api/admin/integrated-requests/$MISSING/ai-report"

# ==================== 管理者削除 ====================
req 70_admin_delete -X DELETE -H "X-Admin-Key: $K" "$BASE/api/admin/admins/$AID"
req 71_admin_delete_again -X DELETE -H "X-Admin-Key: $K" "$BASE/api/admin/admins/$AID"

# --- 復旧 ---
psql_db "delete from ai_reports where session_id='$WV_SID'" >/dev/null
psql_db "delete from ci_ai_reports where session_id='$CSID'" >/dev/null
psql_db "insert into ci_ai_reports select * from smoke_ci_backup" >/dev/null
psql_db "drop table smoke_ci_backup" >/dev/null
psql_db "delete from integrated_reports where request_id='$RID'" >/dev/null
psql_db "delete from integrated_report_requests where id='$RID'" >/dev/null
CA_DEL=$(psql_db "with d as (delete from company_accounts where id='$CO' returning 1) select count(*) from d")
cleanup_check "スモーク企業アカウント削除" "1" "$CA_DEL"

cleanup_check "admins 件数" "$ADMIN_N" "$(snap admins)"
cleanup_check "ai_reports 件数" "$AIR_N" "$(snap ai_reports)"
cleanup_check "ci_ai_reports 件数" "$CIR_N" "$(snap ci_ai_reports)"
cleanup_check "integrated_reports 件数" "$INTR_N" "$(snap integrated_reports)"
cleanup_check "integrated_report_requests 件数" "$INTQ_N" "$(snap integrated_report_requests)"
cleanup_check "company_accounts 件数" "$CA_N" "$(snap company_accounts)"

finish
