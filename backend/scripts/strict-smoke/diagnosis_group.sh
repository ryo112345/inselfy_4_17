#!/bin/zsh
# wire_diagnosis グループ（WV/CI/チーム診断、17 operation）の前後比較スモーク。
# 使い方・前提は lib.sh のヘッダーを参照。
#
# - 読み取りの OR security（CandidateAuth or CompanyAuth）を候補者/企業/未認証で確認する
# - WV の有効提出（201）は BT 推定の μ 検証をクライアント側で再現する必要があり
#   スクリプト化しない（エラー経路のみ）。CI は固定60問なので有効提出まで踏む
# - 作成した WV/CI セッション・結果はスクリプト末尾で DB から削除して復旧する
source "${0:A:h}/lib.sh"

ME_ID="10000000-0000-0000-0000-000000000001"      # taro_yamada（WV seed 結果あり）
OTHER_ID="10000000-0000-0000-0000-000000000004"   # yuki_kobayashi（403 用の別候補者）
NORESULT_ID="10000000-0000-0000-0000-000000000003" # jiro_tanaka（診断結果なし）
WV_SEED_SESS="30000000-0000-0000-0000-000000000001"   # taro の完了済み WV セッション
WV_OTHER_SESS="30004000-0000-0000-0000-000000000001"  # yuki の完了済み WV セッション
MISSING="00000000-0000-0000-0000-000000000000"
# seed チームメンバー1 の招待トークン（値のハードコードは gitleaks が誤検知するため DB から引く）
DIAG_TOKEN=$(psql_db "select invite_token from team_members where id='a2000000-0000-0000-0000-000000000001'")
COMPANY_EMAIL="admin@inselfy.example.com"
COMPANY_PASSWORD="password123"
JAR2="$OUT/company_cookies.txt"
JAR3="$OUT/other_cookies.txt"

# --- 復旧検証用スナップショット ---
snap() { psql_db "select count(*) from $1"; }
WV_SESS_N=$(snap work_values_sessions)
WV_NEEDS_N=$(snap work_needs_scores)
WV_VALUES_N=$(snap work_values_scores)
CI_SESS_N=$(snap career_interest_sessions)
CI_RES_N=$(snap career_interest_results)
CI_BASIC_N=$(snap career_interest_basic_scores)
CI_TYPE_N=$(snap career_interest_type_scores)

bypass_login "$ME_ID"
curl -s -c "$JAR3" -X POST -H "X-Admin-Key: $(admin_key)" \
  "$BASE/api/admin/users/$OTHER_ID/bypass-login" >"$OUT/00_login_other.body"
curl -s -c "$JAR2" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$COMPANY_EMAIL\",\"password\":\"$COMPANY_PASSWORD\"}" \
  "$BASE/api/company/auth/login" >"$OUT/00_login_company.body"

# ========================= Work Values =========================
req 01_wv_start -b "$JAR" -X POST "$BASE/api/work-values/sessions"
WV_SESS=$(python3 -c "import json;print(json.load(open('$OUT/01_wv_start.body')).get('id',''))" 2>/dev/null)
req 02_wv_start_unauth -X POST "$BASE/api/work-values/sessions"
req 03_wv_submit_wrong_count -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"responses":[{"needA":"creativity","needB":"security","winner":"creativity","questionNumber":1}],"mu":{},"se":{}}' \
  "$BASE/api/work-values/sessions/$WV_SESS/results"
req 04_wv_submit_foreign -b "$JAR3" -X POST -H 'Content-Type: application/json' \
  -d '{"responses":[],"mu":{},"se":{}}' "$BASE/api/work-values/sessions/$WV_SESS/results"
req 05_wv_submit_unauth -X POST -H 'Content-Type: application/json' \
  -d '{"responses":[],"mu":{},"se":{}}' "$BASE/api/work-values/sessions/$WV_SESS/results"

# 読み取りの OR security（候補者 / 企業 / 未認証）
req 06_wv_latest -b "$JAR" "$BASE/api/work-values/users/$ME_ID/results/latest"
req 07_wv_latest_company -b "$JAR2" "$BASE/api/work-values/users/$ME_ID/results/latest"
req 08_wv_latest_unauth "$BASE/api/work-values/users/$ME_ID/results/latest"
req 09_wv_latest_none -b "$JAR" "$BASE/api/work-values/users/$NORESULT_ID/results/latest"
req 10_wv_by_session -b "$JAR" "$BASE/api/work-values/sessions/$WV_SEED_SESS/results"
req 11_wv_by_session_company -b "$JAR2" "$BASE/api/work-values/sessions/$WV_SEED_SESS/results"
req 12_wv_by_session_missing -b "$JAR" "$BASE/api/work-values/sessions/$MISSING/results"

req 13_wv_aireport_inprogress -b "$JAR" -X POST "$BASE/api/work-values/sessions/$WV_SESS/ai-report/request"
req 14_wv_aireport_foreign -b "$JAR" -X POST "$BASE/api/work-values/sessions/$WV_OTHER_SESS/ai-report/request"

# ======================== Career Interest ========================
req 20_ci_start -b "$JAR" -X POST "$BASE/api/career-interest/sessions"
CI_SESS=$(python3 -c "import json;print(json.load(open('$OUT/20_ci_start.body')).get('id',''))" 2>/dev/null)
# セッションの items から固定60問の回答（score=3）を生成
python3 -c "
import json
s = json.load(open('$OUT/20_ci_start.body'))
resp = [{'questionNumber': it['questionNumber'], 'itemCode': it['itemCode'], 'score': 3} for it in s['items']]
json.dump({'responses': resp}, open('$OUT/ci_submit.json', 'w'))"
req 21_ci_submit -b "$JAR" -X POST -H 'Content-Type: application/json' \
  --data-binary "@$OUT/ci_submit.json" "$BASE/api/career-interest/sessions/$CI_SESS/results"
req 22_ci_by_session -b "$JAR" "$BASE/api/career-interest/sessions/$CI_SESS/results"
req 23_ci_latest -b "$JAR" "$BASE/api/career-interest/users/$ME_ID/results/latest"
req 24_ci_latest_company -b "$JAR2" "$BASE/api/career-interest/users/$ME_ID/results/latest"
req 25_ci_aireport -b "$JAR" -X POST "$BASE/api/career-interest/sessions/$CI_SESS/ai-report/request"
req 26_ci_aireport_foreign -b "$JAR3" -X POST "$BASE/api/career-interest/sessions/$CI_SESS/ai-report/request"
req 27_ci_submit_completed -b "$JAR" -X POST -H 'Content-Type: application/json' \
  --data-binary "@$OUT/ci_submit.json" "$BASE/api/career-interest/sessions/$CI_SESS/results"
req 28_ci_start_unauth -X POST "$BASE/api/career-interest/sessions"

# ===================== Team Diagnose（招待トークン認可） =====================
req 30_diag_get "$BASE/api/team-diagnose/$DIAG_TOKEN"
req 31_diag_get_bad "$BASE/api/team-diagnose/not_a_real_token"
req 32_diag_wv_start -X POST "$BASE/api/team-diagnose/$DIAG_TOKEN/work-values/sessions"
DIAG_WV_SESS=$(python3 -c "import json;print(json.load(open('$OUT/32_diag_wv_start.body')).get('id',''))" 2>/dev/null)
req 33_diag_wv_start_bad -X POST "$BASE/api/team-diagnose/not_a_real_token/work-values/sessions"
req 34_diag_wv_submit_wrong_count -X POST -H 'Content-Type: application/json' \
  -d '{"responses":[{"needA":"creativity","needB":"security","winner":"creativity","questionNumber":1}],"mu":{},"se":{}}' \
  "$BASE/api/team-diagnose/$DIAG_TOKEN/work-values/sessions/$DIAG_WV_SESS/results"
req 35_diag_ci_start -X POST "$BASE/api/team-diagnose/$DIAG_TOKEN/career-interest/sessions"
DIAG_CI_SESS=$(python3 -c "import json;print(json.load(open('$OUT/35_diag_ci_start.body')).get('id',''))" 2>/dev/null)
python3 -c "
import json
s = json.load(open('$OUT/35_diag_ci_start.body'))
resp = [{'questionNumber': it['questionNumber'], 'itemCode': it['itemCode'], 'score': 3} for it in s['items']]
json.dump({'responses': resp}, open('$OUT/diag_ci_submit.json', 'w'))"
req 36_diag_ci_submit -X POST -H 'Content-Type: application/json' \
  --data-binary "@$OUT/diag_ci_submit.json" \
  "$BASE/api/team-diagnose/$DIAG_TOKEN/career-interest/sessions/$DIAG_CI_SESS/results"
# seed メンバーは wv/ci とも completed 済みなので同値更新（副作用なし）
req 37_diag_status_update -X PUT -H 'Content-Type: application/json' \
  -d '{"wvStatus":"completed"}' "$BASE/api/team-diagnose/$DIAG_TOKEN/status"
req 38_diag_status_invalid -X PUT -H 'Content-Type: application/json' \
  -d '{"wvStatus":"banana"}' "$BASE/api/team-diagnose/$DIAG_TOKEN/status"
req 39_diag_status_bad_token -X PUT -H 'Content-Type: application/json' \
  -d '{"wvStatus":"completed"}' "$BASE/api/team-diagnose/not_a_real_token/status"

# --- 復旧（作成した WV/CI セッションと結果を削除） ---
WV_IDS="'$WV_SESS','$DIAG_WV_SESS'"
CI_IDS="'$CI_SESS','$DIAG_CI_SESS'"
psql_db "delete from work_needs_scores where session_id in ($WV_IDS)" >/dev/null
psql_db "delete from work_values_scores where session_id in ($WV_IDS)" >/dev/null
WV_DEL=$(psql_db "with d as (delete from work_values_sessions where id in ($WV_IDS) returning 1) select count(*) from d")
cleanup_check "WV セッション削除" "2" "$WV_DEL"
psql_db "delete from career_interest_basic_scores where session_id in ($CI_IDS)" >/dev/null
psql_db "delete from career_interest_type_scores where session_id in ($CI_IDS)" >/dev/null
psql_db "delete from career_interest_results where session_id in ($CI_IDS)" >/dev/null
CI_DEL=$(psql_db "with d as (delete from career_interest_sessions where id in ($CI_IDS) returning 1) select count(*) from d")
cleanup_check "CI セッション削除" "2" "$CI_DEL"

cleanup_check "work_values_sessions 件数" "$WV_SESS_N" "$(snap work_values_sessions)"
cleanup_check "work_needs_scores 件数" "$WV_NEEDS_N" "$(snap work_needs_scores)"
cleanup_check "work_values_scores 件数" "$WV_VALUES_N" "$(snap work_values_scores)"
cleanup_check "career_interest_sessions 件数" "$CI_SESS_N" "$(snap career_interest_sessions)"
cleanup_check "career_interest_results 件数" "$CI_RES_N" "$(snap career_interest_results)"
cleanup_check "career_interest_basic_scores 件数" "$CI_BASIC_N" "$(snap career_interest_basic_scores)"
cleanup_check "career_interest_type_scores 件数" "$CI_TYPE_N" "$(snap career_interest_type_scores)"

finish
