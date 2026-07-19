#!/bin/zsh
# wire_user グループ（user/experience/education/skill/follow/similar、22ルート）の
# 前後比較スモーク。使い方・前提は lib.sh のヘッダーを参照。
#
# 書き込み系ケースは dev データを変更するが、スクリプト末尾で全て復旧する
# （smoke ユーザー削除・avatar_url の復元・アップロードファイル削除）。
# 復旧に失敗した場合は WARN を出して非ゼロ終了する。
source "${0:A:h}/lib.sh"

ME_ID="10000000-0000-0000-0000-000000000004" # yuki_kobayashi（seed）
ME="yuki_kobayashi"
OTHER="kenji_watanabe" # seed
SMOKE_USER="strict_mig_smoke"

# --- 復旧用スナップショット ---
SAVED_AVATAR=$(psql_db "select coalesce(avatar_url,'') from users where id='$ME_ID'")
psql_db "delete from users where username='$SMOKE_USER'" >/dev/null # 前回残留の掃除

bypass_login "$ME_ID"

# --- Users: reads ---
req 01_get_by_username "$BASE/api/users/$ME"
req 02_get_by_id "$BASE/api/users/id/$ME_ID"
req 03_get_unknown "$BASE/api/users/no_such_user_xyz"
req 04_similar "$BASE/api/users/id/$ME_ID/similar?limit=3"

# --- Users: create ---
req 05_create_user -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"Strict Mig\",\"username\":\"$SMOKE_USER\"}" "$BASE/api/users"
req 06_create_user_conflict -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"Strict Mig\",\"username\":\"$SMOKE_USER\"}" "$BASE/api/users"
req 07_create_user_bad -X POST -H 'Content-Type: application/json' \
  -d '{"name":"Strict Mig"}' "$BASE/api/users"

# --- Users: profile update ---
LOC=$(curl -s "$BASE/api/users/$ME" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("location") or "")')
req 08_patch_own -b "$JAR" -X PATCH -H 'Content-Type: application/json' \
  -d "{\"location\":\"${LOC}\"}" "$BASE/api/users/$ME"
req 09_patch_unauth -X PATCH -H 'Content-Type: application/json' \
  -d '{"location":"x"}' "$BASE/api/users/$ME"
req 10_patch_foreign -b "$JAR" -X PATCH -H 'Content-Type: application/json' \
  -d '{"location":"x"}' "$BASE/api/users/$OTHER"

# --- upload-image (multipart) ---
PNG="$OUT/px.png"
python3 -c "import base64;open('$PNG','wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='))"
req 11_upload_avatar -b "$JAR" -X POST -F "file=@$PNG;type=image/png" "$BASE/api/users/$ME/upload-image?type=avatar"
req 12_upload_badtype -b "$JAR" -X POST -F "file=@$PNG;type=image/png" "$BASE/api/users/$ME/upload-image?type=banana"
req 13_upload_foreign -b "$JAR" -X POST -F "file=@$PNG;type=image/png" "$BASE/api/users/$OTHER/upload-image?type=avatar"

# --- Experiences ---
req 20_exp_list "$BASE/api/users/$ME/experiences"
req 21_exp_create -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"companyName":"StrictMig社","title":"移行テスト","startYear":2020,"startMonth":4,"isCurrent":true}' \
  "$BASE/api/users/$ME/experiences"
EXP_ID=$(python3 -c "import json;print(json.load(open('$OUT/21_exp_create.body')).get('id',''))" 2>/dev/null)
req 22_exp_update -b "$JAR" -X PUT -H 'Content-Type: application/json' \
  -d '{"companyName":"StrictMig社","title":"移行テスト2","startYear":2020,"startMonth":4,"isCurrent":false,"endYear":2021,"endMonth":3}' \
  "$BASE/api/users/$ME/experiences/$EXP_ID"
req 23_exp_create_unauth -X POST -H 'Content-Type: application/json' \
  -d '{"companyName":"X","title":"Y","startYear":2020,"startMonth":4,"isCurrent":true}' \
  "$BASE/api/users/$ME/experiences"
req 24_exp_create_foreign -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"companyName":"X","title":"Y","startYear":2020,"startMonth":4,"isCurrent":true}' \
  "$BASE/api/users/$OTHER/experiences"
req 25_exp_create_invalid -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"companyName":"","title":"Y","startYear":2020,"startMonth":4,"isCurrent":true}' \
  "$BASE/api/users/$ME/experiences"
req 26_exp_delete -b "$JAR" -X DELETE "$BASE/api/users/$ME/experiences/$EXP_ID"
req 27_exp_delete_missing -b "$JAR" -X DELETE "$BASE/api/users/$ME/experiences/$EXP_ID"

# --- Educations ---
req 30_edu_list "$BASE/api/users/$ME/educations"
req 31_edu_create -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"school":"StrictMig大学","degree":"工学部","startYear":2010,"endYear":2014}' \
  "$BASE/api/users/$ME/educations"
EDU_ID=$(python3 -c "import json;print(json.load(open('$OUT/31_edu_create.body')).get('id',''))" 2>/dev/null)
req 32_edu_update -b "$JAR" -X PUT -H 'Content-Type: application/json' \
  -d '{"school":"StrictMig大学","degree":"情報工学部","startYear":2010,"endYear":2014}' \
  "$BASE/api/users/$ME/educations/$EDU_ID"
req 33_edu_delete -b "$JAR" -X DELETE "$BASE/api/users/$ME/educations/$EDU_ID"

# --- Skills ---
req 40_skill_list "$BASE/api/users/$ME/skills"
req 41_skill_attach -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"StrictMigSkill"}' "$BASE/api/users/$ME/skills"
req 42_skill_detach -b "$JAR" -X DELETE "$BASE/api/users/$ME/skills/StrictMigSkill"
req 43_skill_detach_missing -b "$JAR" -X DELETE "$BASE/api/users/$ME/skills/StrictMigSkill"

# --- Follow ---
req 50_follow -b "$JAR" -X POST "$BASE/api/users/$OTHER/follow"
req 51_follow_dup -b "$JAR" -X POST "$BASE/api/users/$OTHER/follow"
req 52_follow_status -b "$JAR" "$BASE/api/users/$OTHER/follow-status"
req 53_followers "$BASE/api/users/$OTHER/followers"
req 54_following "$BASE/api/users/$ME/following"
req 55_unfollow -b "$JAR" -X DELETE "$BASE/api/users/$OTHER/follow"
req 56_follow_self -b "$JAR" -X POST "$BASE/api/users/$ME/follow"
req 57_follow_status_unauth "$BASE/api/users/$OTHER/follow-status"

# --- 復旧（dev データを実行前の状態へ） ---
# smoke ユーザー削除
DELETED=$(psql_db "delete from users where username='$SMOKE_USER' returning username")
cleanup_check "smoke ユーザー削除" "$SMOKE_USER" "$DELETED"

# アップロードした avatar ファイルを削除し、avatar_url を実行前の値へ戻す
UPLOADED_URL=$(python3 -c "import json;print(json.load(open('$OUT/11_upload_avatar.body')).get('url',''))" 2>/dev/null)
if [[ -n "$UPLOADED_URL" ]]; then
  UPLOADED_FILE="$REPO_ROOT/backend/uploads/${UPLOADED_URL#/api/uploads/}"
  rm -f "$UPLOADED_FILE"
  cleanup_check "アップロードファイル削除" "gone" "$([[ -e $UPLOADED_FILE ]] && echo exists || echo gone)"
fi
RESTORED=$(psql_db "update users set avatar_url = nullif('$SAVED_AVATAR','') where id='$ME_ID' returning coalesce(avatar_url,'')")
cleanup_check "avatar_url 復元" "$SAVED_AVATAR" "$RESTORED"

finish
