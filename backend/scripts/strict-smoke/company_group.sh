#!/bin/zsh
# wire_company グループ（公開プロフィール/公開チームスコア、企業プロフィール＋画像、
# チーム CRUD、タレント検索、保存済み候補者。計24ルート）の前後比較スモーク。
# 使い方・前提は lib.sh のヘッダーを参照。
#
# - 書き込み系（プロフィール更新・画像・チーム・保存）は register で作った専用企業で行い、
#   末尾でアカウントごと削除する（teams / saved_candidates 等は FK cascade）
# - チームメンバー追加は tm_ ユーザーを自動作成するため、削除ケース（member_remove）で
#   必ず回収してから終わる（users 件数で検証）
# - 他社チームへのアクセス: get/update/delete は SQL スコープで 404、
#   member/scores/ace 系は verifyTeamOwner で 403（スペック補正対象）
source "${0:A:h}/lib.sh"

SEED_CO="afd20f1c-b6a8-4809-bc8f-b3f41263b511" # admin@inselfy.example.com（approved・チーム/スコアあり）
SEED_EMAIL="admin@inselfy.example.com"
SEED_PASSWORD="password123"
TARO_ID="10000000-0000-0000-0000-000000000001"
JIRO_ID="10000000-0000-0000-0000-000000000003"
MISSING="00000000-0000-0000-0000-000000000000"
SMOKE_EMAIL="smoke-company-group@example.test"
JARC="$OUT/co2_cookies.txt"   # テスト企業
JARS="$OUT/seed_cookies.txt"  # seed 企業（チーム診断検索用）

SEED_TEAM=$(psql_db "select t.id from teams t join team_members m on m.team_id=t.id where t.company_id='$SEED_CO' limit 1")

# --- 復旧検証用スナップショット ---
snap() { psql_db "select count(*) from $1"; }
CA_N=$(snap company_accounts)
TEAM_N=$(snap teams)
MEMBER_N=$(snap team_members)
USER_N=$(snap users)
SAVED_N=$(snap saved_candidates)

# --- セットアップ: テスト企業を作成して承認・ログイン。seed 企業もログイン ---
curl -s -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"password123\",\"companyName\":\"スモーク株式会社\",\"contactPersonName\":\"検証 太郎\",\"phoneNumber\":\"03-0000-0000\"}" \
  "$BASE/api/company/auth/register" >"$OUT/00_register.body"
CO2=$(python3 -c "import json;print(json.load(open('$OUT/00_register.body')).get('id',''))")
psql_db "update company_accounts set status='approved' where id='$CO2'" >/dev/null
curl -s -c "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"password123\"}" "$BASE/api/company/auth/login" >/dev/null
curl -s -c "$JARS" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SEED_EMAIL\",\"password\":\"$SEED_PASSWORD\"}" "$BASE/api/company/auth/login" >/dev/null
# 1x1 PNG（アップロード用）と偽 GIF
python3 -c "import base64;open('$OUT/px.png','wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='))"
cp "$OUT/px.png" "$OUT/px.gif"

# ==================== 公開エンドポイント（seed 企業） ====================
req 01_pub_profile "$BASE/api/companies/$SEED_CO"
req 02_pub_profile_badid "$BASE/api/companies/not-a-uuid"
req 03_pub_profile_missing "$BASE/api/companies/$MISSING"
req 04_pub_team_scores "$BASE/api/companies/$SEED_CO/teams/scores"
req 05_pub_team_scores_missing "$BASE/api/companies/$MISSING/teams/scores"

# ==================== 企業プロフィール ====================
req 10_profile_get -b "$JARC" "$BASE/api/company/profile"
profile_body() {
  # $1 = foundedYear（スペックは全フィールド必須。1500 はドメイン検証の 400 を踏む）
  printf '{"companyName":"スモーク株式会社","contactPersonName":"検証 太郎","phoneNumber":"03-0000-0000","headline":"スモーク用ヘッドライン","description":"前後比較用の説明文","industry":"IT・通信","location":"東京都","employeeCount":"10名","foundedYear":%s,"foundedMonth":4,"websiteUrl":"https://smoke.example.test","representativeName":"検証 太郎","capital":"1000万円","revenue":"1億円","benefits":["リモート可"],"averageAge":"30歳","averageOvertimeHours":"10時間","paidLeaveRate":"80%%","smokingPolicy":"屋内禁煙"}' "$1"
}
req 11_profile_update -b "$JARC" -X PUT -H 'Content-Type: application/json' \
  -d "$(profile_body 2020)" "$BASE/api/company/profile"
req 12_profile_update_bad -b "$JARC" -X PUT -H 'Content-Type: application/json' \
  -d "$(profile_body 1500)" "$BASE/api/company/profile"
req 13_profile_unauth "$BASE/api/company/profile"

# ==================== プロフィール画像（multipart） ====================
req 14_img_upload_logo -b "$JARC" -X POST -F "file=@$OUT/px.png" "$BASE/api/company/profile/image?type=logo"
req 15_img_upload_badtype -b "$JARC" -X POST -F "file=@$OUT/px.png" "$BASE/api/company/profile/image?type=banana"
req 16_img_upload_badext -b "$JARC" -X POST -F "file=@$OUT/px.gif" "$BASE/api/company/profile/image?type=logo"
req 17_img_upload_nofile -b "$JARC" -X POST -F "other=1" "$BASE/api/company/profile/image?type=logo"
req 18_img_upload_gallery -b "$JARC" -X POST -F "file=@$OUT/px.png" "$BASE/api/company/profile/image?type=gallery"
GURL=$(python3 -c "import json;print(json.load(open('$OUT/18_img_upload_gallery.body')).get('url',''))")
req 19_img_delete_logo -b "$JARC" -X DELETE "$BASE/api/company/profile/image?type=logo"
req 20_img_delete_gallery_nourl -b "$JARC" -X DELETE "$BASE/api/company/profile/image?type=gallery"
req 21_img_delete_gallery -b "$JARC" -X DELETE -G --data-urlencode "type=gallery" --data-urlencode "url=$GURL" \
  "$BASE/api/company/profile/image"

# ==================== チーム ====================
req 30_team_create -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"スモークチーム"}' "$BASE/api/company/teams"
TEAM=$(python3 -c "import json;print(json.load(open('$OUT/30_team_create.body')).get('id',''))")
req 31_team_create_noname -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"name":""}' "$BASE/api/company/teams"
req 32_team_list -b "$JARC" "$BASE/api/company/teams"
req 33_team_get -b "$JARC" "$BASE/api/company/teams/$TEAM"
req 34_team_update -b "$JARC" -X PUT -H 'Content-Type: application/json' \
  -d '{"name":"スモークチーム改","description":"説明","isPublic":false}' "$BASE/api/company/teams/$TEAM"
req 35_team_get_foreign -b "$JARC" "$BASE/api/company/teams/$SEED_TEAM"
req 36_team_update_foreign -b "$JARC" -X PUT -H 'Content-Type: application/json' \
  -d '{"name":"乗っ取り"}' "$BASE/api/company/teams/$SEED_TEAM"
req 37_team_scores -b "$JARC" "$BASE/api/company/teams/$TEAM/scores"
req 38_team_scores_foreign -b "$JARC" "$BASE/api/company/teams/$SEED_TEAM/scores"
req 39_member_add -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"検証 メンバー"}' "$BASE/api/company/teams/$TEAM/members"
MEMBER=$(python3 -c "import json;print(json.load(open('$OUT/39_member_add.body')).get('id',''))")
req 40_member_add_foreign -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"侵入者"}' "$BASE/api/company/teams/$SEED_TEAM/members"
req 41_member_add_noname -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"name":""}' "$BASE/api/company/teams/$TEAM/members"
req 42_ace_set -b "$JARC" -X PUT "$BASE/api/company/teams/$TEAM/ace/$MEMBER"
req 43_ace_set_foreign -b "$JARC" -X PUT "$BASE/api/company/teams/$SEED_TEAM/ace/$MEMBER"
req 44_ace_unset -b "$JARC" -X DELETE "$BASE/api/company/teams/$TEAM/ace"
req 45_ace_unset_foreign -b "$JARC" -X DELETE "$BASE/api/company/teams/$SEED_TEAM/ace"
req 46_member_remove -b "$JARC" -X DELETE "$BASE/api/company/teams/$TEAM/members/$MEMBER"
req 47_member_remove_foreign -b "$JARC" -X DELETE "$BASE/api/company/teams/$SEED_TEAM/members/$MEMBER"
req 48_team_delete_foreign -b "$JARC" -X DELETE "$BASE/api/company/teams/$SEED_TEAM"
req 49_team_delete -b "$JARC" -X DELETE "$BASE/api/company/teams/$TEAM"

# ==================== タレント検索 ====================
req 50_talent_search -b "$JARC" "$BASE/api/company/talents/search?limit=3"
req 51_talent_search_q -b "$JARC" "$BASE/api/company/talents/search?q=Go&limit=3"
req 52_talent_diag_team -b "$JARS" "$BASE/api/company/talents/search/diagnostic?teamId=$SEED_TEAM&limit=3"
req 53_talent_diag_custom -b "$JARC" "$BASE/api/company/talents/search/diagnostic?wv_achievement=80&wv_autonomy=60&limit=3"
req 54_talent_diag_none -b "$JARC" "$BASE/api/company/talents/search/diagnostic?limit=3"
req 55_talent_ci_custom -b "$JARC" "$BASE/api/company/talents/search/diagnostic/ci?ci_R=5&ci_I=3&limit=3"
req 56_talent_integrated_team -b "$JARS" "$BASE/api/company/talents/search/diagnostic/integrated?teamId=$SEED_TEAM&limit=3"
req 57_talent_integrated_wvonly -b "$JARC" "$BASE/api/company/talents/search/diagnostic/integrated?wv_achievement=80&limit=3"
req 58_talent_search_unauth "$BASE/api/company/talents/search"

# ==================== 保存済み候補者 ====================
req 60_saved_list_empty -b "$JARC" "$BASE/api/company/saved-candidates"
req 61_saved_count0 -b "$JARC" "$BASE/api/company/saved-candidates/count"
req 62_saved_save -b "$JARC" -X POST "$BASE/api/company/saved-candidates/$TARO_ID"
req 63_saved_is -b "$JARC" "$BASE/api/company/saved-candidates/$TARO_ID"
req 64_saved_bulk -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"userIds\":[\"$TARO_ID\",\"$JIRO_ID\"]}" "$BASE/api/company/saved-candidates/bulk-check"
req 65_saved_list -b "$JARC" "$BASE/api/company/saved-candidates"
req 66_saved_unsave -b "$JARC" -X DELETE "$BASE/api/company/saved-candidates/$TARO_ID"
req 67_saved_is_false -b "$JARC" "$BASE/api/company/saved-candidates/$TARO_ID"

# --- 復旧 ---
rm -f "$REPO_ROOT/backend/uploads/company-images/${CO2}"_* 2>/dev/null
CA_DEL=$(psql_db "with d as (delete from company_accounts where id='$CO2' returning 1) select count(*) from d")
cleanup_check "スモーク企業アカウント削除" "1" "$CA_DEL"

cleanup_check "company_accounts 件数" "$CA_N" "$(snap company_accounts)"
cleanup_check "teams 件数" "$TEAM_N" "$(snap teams)"
cleanup_check "team_members 件数" "$MEMBER_N" "$(snap team_members)"
cleanup_check "users 件数" "$USER_N" "$(snap users)"
cleanup_check "saved_candidates 件数" "$SAVED_N" "$(snap saved_candidates)"

finish
