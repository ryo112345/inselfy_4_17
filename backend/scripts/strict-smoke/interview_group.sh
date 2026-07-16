#!/bin/zsh
# wire_interview グループ（企業: propose / pending / 一覧 / cancel、
# 候補者: 一覧 / slot 選択 / slots 取得 / cancel。計8ルート）の前後比較スモーク。
# 使い方・前提は lib.sh のヘッダーを参照。WebSocket（/api/ws）はスペック外で対象外。
#
# - 求人・応募・面接一式は register で作った専用企業に閉じ、末尾でアカウントごと削除
#   （job_postings → job_applications → interview_proposals / interviews は FK cascade）
# - propose は応募会話へメッセージを投稿する（conversations / messages も company cascade）
# - スロット日時は固定（2026-08-01）なので、明示 from/to の企業一覧は決定的。
#   デフォルト窓（today+7d）はスロットを含まず常に空
# - 他人の提案 select・他社/他人の面接 cancel は 403（スペック補正対象）
source "${0:A:h}/lib.sh"

SEED_EMAIL="admin@inselfy.example.com"
SEED_PASSWORD="password123"
TARO_ID="10000000-0000-0000-0000-000000000001"   # 応募・面接する候補者
JIRO_ID="10000000-0000-0000-0000-000000000003"   # 部外者（403 を踏む）
MISSING="00000000-0000-0000-0000-000000000000"
SMOKE_EMAIL="smoke-interview-group@example.test"
JB="$SMOKE_LIB_DIR/job_body.py"
JARC="$OUT/co_cookies.txt"    # テスト企業
JARS="$OUT/seed_cookies.txt"  # seed 企業（403 用）
JART="$OUT/taro_cookies.txt"
JARJ="$OUT/jiro_cookies.txt"

# --- 復旧検証用スナップショット ---
snap() { psql_db "select count(*) from $1"; }
CA_N=$(snap company_accounts)
JOB_N=$(snap job_postings)
APP_N=$(snap job_applications)
PROP_N=$(snap interview_proposals)
SLOT_N=$(snap interview_slots)
IV_N=$(snap interviews)
CONV_N=$(snap conversations)
MSG_N=$(snap messages)
NOTIF_N=$(snap notifications)

# --- セットアップ: 企業作成→求人公開→taro が応募 ---
curl -s -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"password123\",\"companyName\":\"面接検証株式会社\",\"contactPersonName\":\"検証 太郎\",\"phoneNumber\":\"03-0000-0000\"}" \
  "$BASE/api/company/auth/register" >"$OUT/00_register.body"
CO=$(python3 -c "import json;print(json.load(open('$OUT/00_register.body')).get('id',''))")
psql_db "update company_accounts set status='approved' where id='$CO'" >/dev/null
curl -s -c "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"password123\"}" "$BASE/api/company/auth/login" >/dev/null
curl -s -c "$JARS" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SEED_EMAIL\",\"password\":\"$SEED_PASSWORD\"}" "$BASE/api/company/auth/login" >/dev/null
for pair in "$TARO_ID:$JART" "$JIRO_ID:$JARJ"; do
  curl -s -c "${pair#*:}" -X POST -H "X-Admin-Key: $(admin_key)" \
    "$BASE/api/admin/users/${pair%%:*}/bypass-login" >/dev/null
done
curl -s -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "$(python3 "$JB" 'title=面接スモーク求人' status=open)" "$BASE/api/company/jobs" >"$OUT/00_job.body"
JOB=$(python3 -c "import json;print(json.load(open('$OUT/00_job.body')).get('id',''))")
curl -s -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"jobPostingId\":\"$JOB\",\"message\":\"よろしくお願いします\"}" "$BASE/api/applications" >"$OUT/00_apply.body"
APP=$(python3 -c "import json;print(json.load(open('$OUT/00_apply.body')).get('id',''))")

S1="2026-08-01T10:00:00+09:00"; E1="2026-08-01T11:00:00+09:00"
S2="2026-08-01T14:00:00+09:00"; E2="2026-08-01T15:00:00+09:00"

# ==================== 企業: 提案 ====================
req 01_propose_noslots -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$APP\",\"message\":\"\",\"location\":\"\",\"durationMinutes\":60,\"expiresInDays\":7,\"slots\":[]}" \
  "$BASE/api/company/interviews/propose"
req 02_propose_badtime -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$APP\",\"message\":\"\",\"location\":\"\",\"durationMinutes\":60,\"expiresInDays\":7,\"slots\":[{\"startTime\":\"あした\",\"endTime\":\"$E1\"}]}" \
  "$BASE/api/company/interviews/propose"
req 03_propose_endbefore -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$APP\",\"message\":\"\",\"location\":\"\",\"durationMinutes\":60,\"expiresInDays\":7,\"slots\":[{\"startTime\":\"$E1\",\"endTime\":\"$S1\"}]}" \
  "$BASE/api/company/interviews/propose"
req 04_propose_missing_app -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$MISSING\",\"message\":\"\",\"location\":\"\",\"durationMinutes\":60,\"expiresInDays\":7,\"slots\":[{\"startTime\":\"$S1\",\"endTime\":\"$E1\"}]}" \
  "$BASE/api/company/interviews/propose"
req 05_propose -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$APP\",\"message\":\"一次面接のご案内です\",\"location\":\"オンライン\",\"durationMinutes\":60,\"expiresInDays\":7,\"slots\":[{\"startTime\":\"$S1\",\"endTime\":\"$E1\"},{\"startTime\":\"$S2\",\"endTime\":\"$E2\"}]}" \
  "$BASE/api/company/interviews/propose"
PROP=$(python3 -c "import json;print(json.load(open('$OUT/05_propose.body')).get('proposalId',''))")
SLOT1=$(python3 -c "import json;print(json.load(open('$OUT/05_propose.body'))['slots'][0]['id'])")
req 06_propose_unauth -X POST -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$APP\",\"message\":\"\",\"location\":\"\",\"durationMinutes\":60,\"expiresInDays\":7,\"slots\":[{\"startTime\":\"$S1\",\"endTime\":\"$E1\"}]}" \
  "$BASE/api/company/interviews/propose"

# ==================== 企業: pending 確認 ====================
req 07_pending -b "$JARC" "$BASE/api/company/interviews/pending/$APP"
req 08_pending_missing -b "$JARC" "$BASE/api/company/interviews/pending/$MISSING"

# ==================== 候補者: 一覧・スロット ====================
req 10_cand_list -b "$JART" "$BASE/api/interviews"
req 11_slots -b "$JART" "$BASE/api/interviews/proposals/$PROP/slots"
req 12_slots_missing -b "$JART" "$BASE/api/interviews/proposals/$MISSING/slots"
req 13_slots_unauth "$BASE/api/interviews/proposals/$PROP/slots"

# ==================== 候補者: スロット選択 ====================
req 14_select_foreign -b "$JARJ" -X POST -H 'Content-Type: application/json' \
  -d "{\"slotId\":\"$SLOT1\",\"startTime\":\"\",\"endTime\":\"\"}" \
  "$BASE/api/interviews/proposals/$PROP/select"
req 15_select_badslot -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"slotId\":\"$MISSING\",\"startTime\":\"\",\"endTime\":\"\"}" \
  "$BASE/api/interviews/proposals/$PROP/select"
req 16_select_outside -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"slotId\":\"$SLOT1\",\"startTime\":\"2026-08-02T10:00:00+09:00\",\"endTime\":\"2026-08-02T10:30:00+09:00\"}" \
  "$BASE/api/interviews/proposals/$PROP/select"
req 17_select -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"slotId\":\"$SLOT1\",\"startTime\":\"\",\"endTime\":\"\"}" \
  "$BASE/api/interviews/proposals/$PROP/select"
IV=$(python3 -c "import json;print(json.load(open('$OUT/17_select.body'))['interview']['id'])")
req 18_select_again -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"slotId\":\"$SLOT1\",\"startTime\":\"\",\"endTime\":\"\"}" \
  "$BASE/api/interviews/proposals/$PROP/select"
req 19_pending_after_select -b "$JARC" "$BASE/api/company/interviews/pending/$APP"

# ==================== 企業: 一覧 ====================
req 20_co_list -b "$JARC" "$BASE/api/company/interviews?from=2026-07-30&to=2026-08-05"
req 21_co_list_default -b "$JARC" "$BASE/api/company/interviews"
req 22_co_list_unauth "$BASE/api/company/interviews"

# ==================== キャンセル ====================
req 23_cancel_foreign_co -b "$JARS" -X POST "$BASE/api/company/interviews/$IV/cancel"
req 24_cancel_foreign_cand -b "$JARJ" -X POST "$BASE/api/interviews/$IV/cancel"
req 25_cancel_missing -b "$JART" -X POST "$BASE/api/interviews/$MISSING/cancel"
req 26_cancel_cand -b "$JART" -X POST "$BASE/api/interviews/$IV/cancel"
req 27_cancel_again -b "$JART" -X POST "$BASE/api/interviews/$IV/cancel"

# 再提案→選択→企業側キャンセル（propose が旧 pending を整理する経路も踏む）
req 28_propose2 -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$APP\",\"message\":\"再調整のご案内\",\"location\":\"オンライン\",\"durationMinutes\":30,\"expiresInDays\":7,\"slots\":[{\"startTime\":\"$S2\",\"endTime\":\"$E2\"}]}" \
  "$BASE/api/company/interviews/propose"
PROP2=$(python3 -c "import json;print(json.load(open('$OUT/28_propose2.body')).get('proposalId',''))")
SLOT2=$(python3 -c "import json;print(json.load(open('$OUT/28_propose2.body'))['slots'][0]['id'])")
curl -s -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"slotId\":\"$SLOT2\",\"startTime\":\"\",\"endTime\":\"\"}" \
  "$BASE/api/interviews/proposals/$PROP2/select" >"$OUT/28b_select2.body"
IV2=$(python3 -c "import json;print(json.load(open('$OUT/28b_select2.body'))['interview']['id'])")
req 29_cancel_co -b "$JARC" -X POST "$BASE/api/company/interviews/$IV2/cancel"
req 30_cand_list_after -b "$JART" "$BASE/api/interviews"
req 31_co_list_after -b "$JARC" "$BASE/api/company/interviews?from=2026-07-30&to=2026-08-05"

# --- 復旧 ---
# interview 系3テーブルは FK cascade が無いため依存順に手動削除してから企業を消す
psql_db "delete from interviews where company_id='$CO'" >/dev/null
psql_db "delete from interview_slots where proposal_id in (select id from interview_proposals where company_id='$CO')" >/dev/null
psql_db "delete from interview_proposals where company_id='$CO'" >/dev/null
# テスト企業ごと削除（求人→応募、会話・メッセージは cascade）
CA_DEL=$(psql_db "with d as (delete from company_accounts where id='$CO' returning 1) select count(*) from d")
cleanup_check "スモーク企業アカウント削除" "1" "$CA_DEL"

cleanup_check "company_accounts 件数" "$CA_N" "$(snap company_accounts)"
cleanup_check "job_postings 件数" "$JOB_N" "$(snap job_postings)"
cleanup_check "job_applications 件数" "$APP_N" "$(snap job_applications)"
cleanup_check "interview_proposals 件数" "$PROP_N" "$(snap interview_proposals)"
cleanup_check "interview_slots 件数" "$SLOT_N" "$(snap interview_slots)"
cleanup_check "interviews 件数" "$IV_N" "$(snap interviews)"
cleanup_check "conversations 件数" "$CONV_N" "$(snap conversations)"
cleanup_check "messages 件数" "$MSG_N" "$(snap messages)"
cleanup_check "notifications 件数" "$NOTIF_N" "$(snap notifications)"

finish
