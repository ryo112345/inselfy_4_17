#!/bin/zsh
# wire_auth グループ（/api/auth 4本 + /api/company/auth 5本）の前後比較スモーク。
# 使い方・前提は lib.sh のヘッダーを参照。
#
# - cookie を焼く/消すのがこのグループの本体なので、reqc で Set-Cookie の
#   名前と属性（値はマスク）を .cookies に保存して比較する（diff_bodies.py が対応）
# - Google ログインの正常系は本物の ID トークンが必要なためエラー経路のみ。
#   候補者の有効 refresh は admin bypass-login が焼く refresh_token cookie で踏む
# - 企業側は register で作った pending アカウントを psql でステータス遷移させ、
#   403 ACCOUNT_PENDING / ACCOUNT_REJECTED / 200 の3態を踏む
# - refresh はローテーション（全失効→新規発行）するため、既存の生存トークンを
#   記録しておき末尾で revoked_at を復元・テスト中に作った行は削除する
source "${0:A:h}/lib.sh"

CAND_ID="10000000-0000-0000-0000-000000000001" # taro_yamada
SMOKE_EMAIL="smoke-auth-group@example.test"
SMOKE_PASSWORD="password123"
JAR2="$OUT/company_cookies.txt"

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
RT_N=$(snap refresh_tokens)
CA_N=$(snap company_accounts)
CRT_N=$(snap company_refresh_tokens)
TEST_START=$(psql_db "select now()")
LIVE_RT_IDS=$(psql_db "select string_agg(''''||id||'''', ',') from refresh_tokens where user_id='$CAND_ID' and revoked_at is null")

# ========================= 候補者 /api/auth =========================
req 01_google_invalid -X POST -H 'Content-Type: application/json' \
  -d '{"idToken":"bogus-token"}' "$BASE/api/auth/google"
req 02_google_empty -X POST -H 'Content-Type: application/json' \
  -d '{"idToken":""}' "$BASE/api/auth/google"
req 03_google_malformed -X POST -H 'Content-Type: application/json' \
  -d '{bad json' "$BASE/api/auth/google"
req 04_refresh_nocookie -X POST "$BASE/api/auth/refresh"
reqc 05_refresh_bogus -X POST -H 'Cookie: refresh_token=bogus' "$BASE/api/auth/refresh"

bypass_login "$CAND_ID"
reqc 06_refresh_valid -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/refresh"
reqc 07_refresh_rotated -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/refresh"
req 08_me -b "$JAR" "$BASE/api/auth/me"
req 09_me_unauth "$BASE/api/auth/me"
reqc 10_logout -X POST "$BASE/api/auth/logout"

# ====================== 企業 /api/company/auth ======================
register_body() {
  printf '{"email":"%s","password":"%s","companyName":"スモーク株式会社","contactPersonName":"検証 太郎","phoneNumber":"03-0000-0000"}' "$1" "$2"
}
req 20_register -X POST -H 'Content-Type: application/json' \
  -d "$(register_body "$SMOKE_EMAIL" "$SMOKE_PASSWORD")" "$BASE/api/company/auth/register"
req 21_register_dup -X POST -H 'Content-Type: application/json' \
  -d "$(register_body "$SMOKE_EMAIL" "$SMOKE_PASSWORD")" "$BASE/api/company/auth/register"
req 22_register_shortpw -X POST -H 'Content-Type: application/json' \
  -d "$(register_body "smoke-auth-short@example.test" "short")" "$BASE/api/company/auth/register"
req 23_register_bademail -X POST -H 'Content-Type: application/json' \
  -d "$(register_body "not-an-email" "$SMOKE_PASSWORD")" "$BASE/api/company/auth/register"

login_body() {
  printf '{"email":"%s","password":"%s"}' "$1" "$2"
}
req 24_login_pending -X POST -H 'Content-Type: application/json' \
  -d "$(login_body "$SMOKE_EMAIL" "$SMOKE_PASSWORD")" "$BASE/api/company/auth/login"
psql_db "update company_accounts set status='rejected' where email='$SMOKE_EMAIL'" >/dev/null
req 25_login_rejected -X POST -H 'Content-Type: application/json' \
  -d "$(login_body "$SMOKE_EMAIL" "$SMOKE_PASSWORD")" "$BASE/api/company/auth/login"
psql_db "update company_accounts set status='approved' where email='$SMOKE_EMAIL'" >/dev/null
reqc 26_login_ok -c "$JAR2" -X POST -H 'Content-Type: application/json' \
  -d "$(login_body "$SMOKE_EMAIL" "$SMOKE_PASSWORD")" "$BASE/api/company/auth/login"
req 27_login_wrongpw -X POST -H 'Content-Type: application/json' \
  -d "$(login_body "$SMOKE_EMAIL" "wrong-password")" "$BASE/api/company/auth/login"
req 28_login_emptypw -X POST -H 'Content-Type: application/json' \
  -d "$(login_body "$SMOKE_EMAIL" "")" "$BASE/api/company/auth/login"

req 29_me -b "$JAR2" "$BASE/api/company/auth/me"
req 30_me_unauth "$BASE/api/company/auth/me"
reqc 31_refresh -b "$JAR2" -c "$JAR2" -X POST "$BASE/api/company/auth/refresh"
req 32_refresh_nocookie -X POST "$BASE/api/company/auth/refresh"
req 33_refresh_bogus -X POST -H 'Cookie: company_refresh_token=bogus' "$BASE/api/company/auth/refresh"
reqc 34_logout -X POST "$BASE/api/company/auth/logout"

# --- 復旧 ---
# 候補者: テスト中に作った refresh_tokens を削除し、既存トークンの失効を戻す
psql_db "delete from refresh_tokens where user_id='$CAND_ID' and created_at >= '$TEST_START'" >/dev/null
if [[ -n "$LIVE_RT_IDS" ]]; then
  psql_db "update refresh_tokens set revoked_at=null where id in ($LIVE_RT_IDS)" >/dev/null
fi
# 企業: スモーク用アカウントとその refresh トークンを削除（FK cascade）
CA_DEL=$(psql_db "with d as (delete from company_accounts where email='$SMOKE_EMAIL' returning 1) select count(*) from d")
cleanup_check "スモーク企業アカウント削除" "1" "$CA_DEL"

cleanup_check "refresh_tokens 件数" "$RT_N" "$(snap refresh_tokens)"
cleanup_check "company_accounts 件数" "$CA_N" "$(snap company_accounts)"
cleanup_check "company_refresh_tokens 件数" "$CRT_N" "$(snap company_refresh_tokens)"

finish
