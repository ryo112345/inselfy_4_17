#!/bin/zsh
# wire_jobs グループ（企業求人 CRUD、求人画像アップロード×3、公開求人一覧/詳細、
# 候補者応募/一覧/チェック/取り下げ、企業応募一覧/詳細/ステータス更新。計18ルート）の
# 前後比較スモーク。使い方・前提は lib.sh のヘッダーを参照。
#
# - 書き込みは register で作った専用企業に閉じ、末尾でアカウントごと削除
#   （job_postings / job_applications は FK cascade。応募系は通知を作らない）
# - アップロードされた画像ファイルはレスポンス URL から実パスを求めて削除
# - 他社求人の get/update/delete は port.ErrForbidden で 403（スペック補正対象）。
#   他社応募の get/status は SQL 非スコープだが owner 不一致 → 404（実装どおり）
# - JobPostingRequest は全フィールド必須のため job_body.py で完全な JSON を組み立てる
source "${0:A:h}/lib.sh"

SEED_CO="afd20f1c-b6a8-4809-bc8f-b3f41263b511" # admin@inselfy.example.com
SEED_EMAIL="admin@inselfy.example.com"
SEED_PASSWORD="password123"
SEED_JOB="b0000000-0000-0000-0000-000000000001"  # 公開中の seed 求人
SEED_APP="99991000-0000-0000-0000-000000000001"  # seed 企業宛の応募（taro）
TARO_ID="10000000-0000-0000-0000-000000000001"   # 応募→ステータス更新対象
JIRO_ID="10000000-0000-0000-0000-000000000003"   # 応募→取り下げフロー
MISSING="00000000-0000-0000-0000-000000000000"
SMOKE_EMAIL="smoke-jobs-group@example.test"
JARC="$OUT/co_cookies.txt"
JARS="$OUT/seed_cookies.txt"
JART="$OUT/taro_cookies.txt"
JARJ="$OUT/jiro_cookies.txt"
JB="$SMOKE_LIB_DIR/job_body.py"

# --- 復旧検証用スナップショット ---
snap() { psql_db "select count(*) from $1"; }
CA_N=$(snap company_accounts)
JOB_N=$(snap job_postings)
APP_N=$(snap job_applications)

# --- セットアップ ---
curl -s -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"password123\",\"companyName\":\"求人検証株式会社\",\"contactPersonName\":\"検証 太郎\",\"phoneNumber\":\"03-0000-0000\"}" \
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
python3 -c "import base64;open('$OUT/px.png','wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='))"
cp "$OUT/px.png" "$OUT/px.gif"

# ==================== 企業求人 CRUD ====================
req 01_job_create_draft -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "$(python3 "$JB" 'title=下書き求人' status=draft)" "$BASE/api/company/jobs"
JOB_DRAFT=$(python3 -c "import json;print(json.load(open('$OUT/01_job_create_draft.body')).get('id',''))")
req 02_job_create_open -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "$(python3 "$JB" 'title=スモーク公開求人｜Goエンジニア' status=open)" "$BASE/api/company/jobs"
JOB_OPEN=$(python3 -c "import json;print(json.load(open('$OUT/02_job_create_open.body')).get('id',''))")
req 03_job_create_notitle -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "$(python3 "$JB" title= status=draft)" "$BASE/api/company/jobs"
req 04_job_create_badstatus -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "$(python3 "$JB" 'title=t' status=banana)" "$BASE/api/company/jobs"
req 05_job_list -b "$JARC" "$BASE/api/company/jobs"
req 06_job_get -b "$JARC" "$BASE/api/company/jobs/$JOB_DRAFT"
req 07_job_get_foreign -b "$JARC" "$BASE/api/company/jobs/$SEED_JOB"
req 08_job_get_missing -b "$JARC" "$BASE/api/company/jobs/$MISSING"
req 09_job_update -b "$JARC" -X PUT -H 'Content-Type: application/json' \
  -d "$(python3 "$JB" 'title=下書き求人（改）' status=draft)" "$BASE/api/company/jobs/$JOB_DRAFT"
req 10_job_update_foreign -b "$JARC" -X PUT -H 'Content-Type: application/json' \
  -d "$(python3 "$JB" 'title=乗っ取り' status=draft)" "$BASE/api/company/jobs/$SEED_JOB"
req 11_job_update_notitle -b "$JARC" -X PUT -H 'Content-Type: application/json' \
  -d "$(python3 "$JB" title= status=draft)" "$BASE/api/company/jobs/$JOB_DRAFT"
req 12_job_list_unauth "$BASE/api/company/jobs"

# ==================== 求人画像アップロード ====================
req 15_upload_team -b "$JARC" -X POST -F "file=@$OUT/px.png" "$BASE/api/company/jobs/team-member-photo"
req 16_upload_gallery -b "$JARC" -X POST -F "file=@$OUT/px.png" "$BASE/api/company/jobs/gallery-image"
req 17_upload_cover -b "$JARC" -X POST -F "file=@$OUT/px.png" "$BASE/api/company/jobs/cover-image"
req 18_upload_badext -b "$JARC" -X POST -F "file=@$OUT/px.gif" "$BASE/api/company/jobs/cover-image"
req 19_upload_nofile -b "$JARC" -X POST -F "other=1" "$BASE/api/company/jobs/cover-image"
req 20_upload_unauth -X POST -F "file=@$OUT/px.png" "$BASE/api/company/jobs/cover-image"

# ==================== 公開求人 ====================
req 25_pub_list_all "$BASE/api/jobs"
req 26_pub_list_paged "$BASE/api/jobs?limit=3&offset=1"
req 27_pub_list_search "$BASE/api/jobs?limit=3&search=Go"
req 28_pub_list_sort "$BASE/api/jobs?limit=3&sort=salary"
req 29_pub_list_valuefilters "$BASE/api/jobs?limit=3&valueFilters=achievement:50,autonomy:40"
req 30_pub_list_badvf "$BASE/api/jobs?limit=3&valueFilters=banana"
req 31_pub_get "$BASE/api/jobs/$SEED_JOB"
req 32_pub_get_draft "$BASE/api/jobs/$JOB_DRAFT"
req 33_pub_get_missing "$BASE/api/jobs/$MISSING"
req 34_pub_get_badid "$BASE/api/jobs/not-a-uuid"

# ==================== 候補者応募 ====================
req 40_apply -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"jobPostingId\":\"$JOB_OPEN\",\"message\":\"ぜひお願いします\"}" "$BASE/api/applications"
APP_TARO=$(python3 -c "import json;print(json.load(open('$OUT/40_apply.body')).get('id',''))")
req 41_apply_dup -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"jobPostingId\":\"$JOB_OPEN\",\"message\":\"\"}" "$BASE/api/applications"
req 42_apply_draft -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"jobPostingId\":\"$JOB_DRAFT\",\"message\":\"\"}" "$BASE/api/applications"
req 43_apply_missing -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"jobPostingId\":\"$MISSING\",\"message\":\"\"}" "$BASE/api/applications"
req 44_apply_nobody -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d '{}' "$BASE/api/applications"
req 45_cand_list -b "$JART" "$BASE/api/applications"
req 46_check_applied_true -b "$JART" "$BASE/api/applications/check?jobPostingId=$JOB_OPEN"
req 47_check_applied_false -b "$JARJ" "$BASE/api/applications/check?jobPostingId=$SEED_JOB"
req 48_check_noparam -b "$JART" "$BASE/api/applications/check"
req 49_apply_jiro -b "$JARJ" -X POST -H 'Content-Type: application/json' \
  -d "{\"jobPostingId\":\"$JOB_OPEN\",\"message\":\"\"}" "$BASE/api/applications"
APP_JIRO=$(python3 -c "import json;print(json.load(open('$OUT/49_apply_jiro.body')).get('id',''))")
req 50_withdraw -b "$JARJ" -X POST "$BASE/api/applications/$APP_JIRO/withdraw"
req 51_withdraw_foreign -b "$JARJ" -X POST "$BASE/api/applications/$APP_TARO/withdraw"
req 52_withdraw_missing -b "$JARJ" -X POST "$BASE/api/applications/$MISSING/withdraw"
req 53_apply_unauth -X POST -H 'Content-Type: application/json' \
  -d "{\"jobPostingId\":\"$JOB_OPEN\",\"message\":\"\"}" "$BASE/api/applications"

# ==================== 企業側応募 ====================
req 60_co_app_list -b "$JARC" "$BASE/api/company/applications"
req 61_co_app_list_status -b "$JARC" "$BASE/api/company/applications?status=applied"
req 62_co_app_list_job -b "$JARC" "$BASE/api/company/applications?job_posting_id=$JOB_OPEN"
req 63_co_app_list_keyword -b "$JARC" "$BASE/api/company/applications?keyword=山田"
req 64_co_app_list_dates -b "$JARC" "$BASE/api/company/applications?date_from=2000-01-01T00:00:00Z&limit=10"
req 65_co_app_get -b "$JARC" "$BASE/api/company/applications/$APP_TARO"
req 66_co_app_get_foreign -b "$JARC" "$BASE/api/company/applications/$SEED_APP"
req 67_co_app_get_missing -b "$JARC" "$BASE/api/company/applications/$MISSING"
req 68_status_update -b "$JARC" -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"screening"}' "$BASE/api/company/applications/$APP_TARO/status"
req 69_status_update_invalid -b "$JARC" -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"banana"}' "$BASE/api/company/applications/$APP_TARO/status"
req 70_status_update_foreign -b "$JARC" -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"screening"}' "$BASE/api/company/applications/$SEED_APP/status"
req 71_co_app_list_unauth "$BASE/api/company/applications"

# --- 復旧 ---
# アップロード画像はレスポンス URL（/api/uploads/<subdir>/<8hex>.<ext>）から実パスを求めて削除
for f in 15_upload_team 16_upload_gallery 17_upload_cover; do
  URL=$(python3 -c "import json;print(json.load(open('$OUT/$f.body')).get('url',''))")
  [[ -n "$URL" ]] && rm -f "$REPO_ROOT/backend/uploads/${URL#/api/uploads/}"
done
CA_DEL=$(psql_db "with d as (delete from company_accounts where id='$CO' returning 1) select count(*) from d")
cleanup_check "スモーク企業アカウント削除" "1" "$CA_DEL"

cleanup_check "company_accounts 件数" "$CA_N" "$(snap company_accounts)"
cleanup_check "job_postings 件数" "$JOB_N" "$(snap job_postings)"
cleanup_check "job_applications 件数" "$APP_N" "$(snap job_applications)"

finish
