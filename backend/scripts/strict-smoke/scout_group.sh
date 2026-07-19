#!/bin/zsh
# wire_scout グループ（企業スカウト送信/一覧/詳細/返信/クレジット/品質/ダッシュボード、
# スカウトテンプレート CRUD、候補者スカウト一覧/未読/詳細/応答/返信/一括、
# スカウト受け入れ設定。計21ルート）の前後比較スモーク。
# 使い方・前提は lib.sh のヘッダーを参照。
#
# - 書き込みは register で作った専用企業に閉じ、末尾でアカウントごと削除
#   （scout_messages / credits / ledger / templates / conversations は FK cascade）
# - 候補者宛 notifications（scout_received 等）は cascade されないため
#   reference_id = 作成スカウトID で手動削除する
# - taro の user_scout_settings は設定テストで書き換えるため、事前状態
#   （行なし or 値）を記録して復旧する
# - 他社リソースの 403（ErrNotOwner）: seed 企業ログインで detail/reply を、
#   seed 企業のテンプレートで get/update/delete を踏む（スペック補正対象）
source "${0:A:h}/lib.sh"

SEED_EMAIL="admin@inselfy.example.com"
SEED_PASSWORD="password123"
TARO_ID="10000000-0000-0000-0000-000000000001"   # 返信フロー＋設定テスト
HANAKO_ID="10000000-0000-0000-0000-000000000002" # 興味ありフロー
JIRO_ID="10000000-0000-0000-0000-000000000003"   # 一括辞退＋再送フロー
MISSING="00000000-0000-0000-0000-000000000000"
SMOKE_EMAIL="smoke-scout-group@example.test"
JARC="$OUT/co_cookies.txt"    # テスト企業
JARS="$OUT/seed_cookies.txt"  # seed 企業（foreign 403 用）
JART="$OUT/taro_cookies.txt"
JARH="$OUT/hanako_cookies.txt"
JARJ="$OUT/jiro_cookies.txt"

# --- 復旧検証用スナップショット ---
snap() { psql_db "select count(*) from $1"; }
CA_N=$(snap company_accounts)
MSG_N=$(snap scout_messages)
REPLY_N=$(snap scout_replies)
TPL_N=$(snap scout_templates)
CREDIT_N=$(snap scout_credits)
LEDGER_N=$(snap scout_credit_ledger)
NOTIF_N=$(snap notifications)
CONV_N=$(snap conversations)
SETTINGS_N=$(snap user_scout_settings)
TARO_SETTING=$(psql_db "select accepting_scouts from user_scout_settings where user_id='$TARO_ID'")

# --- セットアップ: テスト企業を作成して承認・ログイン。seed 企業と候補者3人もログイン ---
curl -s -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"password123\",\"companyName\":\"スカウト検証株式会社\",\"contactPersonName\":\"検証 太郎\",\"phoneNumber\":\"03-0000-0000\"}" \
  "$BASE/api/company/auth/register" >"$OUT/00_register.body"
CO=$(python3 -c "import json;print(json.load(open('$OUT/00_register.body')).get('id',''))")
psql_db "update company_accounts set status='approved' where id='$CO'" >/dev/null
curl -s -c "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"password123\"}" "$BASE/api/company/auth/login" >/dev/null
curl -s -c "$JARS" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SEED_EMAIL\",\"password\":\"$SEED_PASSWORD\"}" "$BASE/api/company/auth/login" >/dev/null
for pair in "$TARO_ID:$JART" "$HANAKO_ID:$JARH" "$JIRO_ID:$JARJ"; do
  curl -s -c "${pair#*:}" -X POST -H "X-Admin-Key: $(admin_key)" \
    "$BASE/api/admin/users/${pair%%:*}/bypass-login" >/dev/null
done

# ==================== スカウトテンプレート ====================
req 01_tpl_create -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"スモークテンプレ","subject":"ご案内","body":"{{candidate_name}}様、ぜひ一度お話しませんか"}' \
  "$BASE/api/company/scout-templates"
TPL=$(python3 -c "import json;print(json.load(open('$OUT/01_tpl_create.body')).get('id',''))")
req 02_tpl_create_noname -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"","subject":"s","body":"b"}' "$BASE/api/company/scout-templates"
req 03_tpl_list -b "$JARC" "$BASE/api/company/scout-templates"
req 04_tpl_get -b "$JARC" "$BASE/api/company/scout-templates/$TPL"
req 05_tpl_get_missing -b "$JARC" "$BASE/api/company/scout-templates/$MISSING"
req 06_tpl_update -b "$JARC" -X PUT -H 'Content-Type: application/json' \
  -d '{"name":"スモークテンプレ改","subject":"ご案内(改)","body":"{{candidate_name}}様、ぜひ一度お話しませんか"}' \
  "$BASE/api/company/scout-templates/$TPL"
req 07_tpl_update_empty_subject -b "$JARC" -X PUT -H 'Content-Type: application/json' \
  -d '{"name":"n","subject":"","body":"b"}' "$BASE/api/company/scout-templates/$TPL"
# 他社テンプレート（seed 企業で作成 → 403 を踏んで最後に seed 側で削除）
curl -s -b "$JARS" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"他社テンプレ","subject":"s","body":"b"}' "$BASE/api/company/scout-templates" >"$OUT/ft.body"
FT=$(python3 -c "import json;print(json.load(open('$OUT/ft.body')).get('id',''))")
req 08_tpl_get_foreign -b "$JARC" "$BASE/api/company/scout-templates/$FT"
req 09_tpl_update_foreign -b "$JARC" -X PUT -H 'Content-Type: application/json' \
  -d '{"name":"乗っ取り","subject":"s","body":"b"}' "$BASE/api/company/scout-templates/$FT"
req 10_tpl_delete_foreign -b "$JARC" -X DELETE "$BASE/api/company/scout-templates/$FT"
req 11_tpl_unauth "$BASE/api/company/scout-templates"
# 上限 50 件まで埋めて 409 を踏む（現在 1 件 → 49 件追加）
for i in $(seq 1 49); do
  curl -s -o /dev/null -b "$JARC" -X POST -H 'Content-Type: application/json' \
    -d "{\"name\":\"埋め草$i\",\"subject\":\"s\",\"body\":\"b\"}" "$BASE/api/company/scout-templates"
done
req 12_tpl_create_toomany -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"51個目","subject":"s","body":"b"}' "$BASE/api/company/scout-templates"
req 13_tpl_delete -b "$JARC" -X DELETE "$BASE/api/company/scout-templates/$TPL"

# ==================== 企業スカウト（送信前の初期状態） ====================
req 20_credits -b "$JARC" "$BASE/api/company/scouts/credits"
req 21_quality -b "$JARC" "$BASE/api/company/scouts/quality"
req 22_dashboard -b "$JARC" "$BASE/api/company/scouts/dashboard"

# ==================== スカウト送信 ====================
req 23_send_nosubject -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$TARO_ID\",\"subject\":\"\",\"body\":\"b\"}" "$BASE/api/company/scouts"
req 24_send_missing_candidate -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$MISSING\",\"subject\":\"s\",\"body\":\"b\"}" "$BASE/api/company/scouts"
req 25_send_taro -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$TARO_ID\",\"subject\":\"一緒に働きませんか\",\"body\":\"{{candidate_name}}様へ。経歴を拝見しご連絡しました。\"}" \
  "$BASE/api/company/scouts"
SCOUT_TARO=$(python3 -c "import json;print(json.load(open('$OUT/25_send_taro.body')).get('id',''))")
req 26_send_taro_dup -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$TARO_ID\",\"subject\":\"二通目\",\"body\":\"b\"}" "$BASE/api/company/scouts"
req 27_send_hanako -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$HANAKO_ID\",\"subject\":\"花子様へのご案内\",\"body\":\"ポジションのご紹介です。\"}" \
  "$BASE/api/company/scouts"
SCOUT_HANAKO=$(python3 -c "import json;print(json.load(open('$OUT/27_send_hanako.body')).get('id',''))")
req 28_send_jiro -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$JIRO_ID\",\"subject\":\"次郎様へのご案内\",\"body\":\"ポジションのご紹介です。\"}" \
  "$BASE/api/company/scouts"
SCOUT_JIRO=$(python3 -c "import json;print(json.load(open('$OUT/28_send_jiro.body')).get('id',''))")

# ==================== 企業スカウト（一覧・詳細・返信） ====================
req 29_list -b "$JARC" "$BASE/api/company/scouts"
req 30_list_status -b "$JARC" "$BASE/api/company/scouts?status=sent"
req 31_list_paged -b "$JARC" "$BASE/api/company/scouts?limit=2&offset=1"
req 32_detail -b "$JARC" "$BASE/api/company/scouts/$SCOUT_TARO"
req 33_detail_foreign -b "$JARS" "$BASE/api/company/scouts/$SCOUT_TARO"
req 34_detail_missing -b "$JARC" "$BASE/api/company/scouts/$MISSING"
req 35_reply_company -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"body":"補足です。カジュアル面談も可能です。"}' "$BASE/api/company/scouts/$SCOUT_HANAKO/reply"
req 36_reply_company_foreign -b "$JARS" -X POST -H 'Content-Type: application/json' \
  -d '{"body":"乗っ取り"}' "$BASE/api/company/scouts/$SCOUT_HANAKO/reply"
req 37_reply_company_empty -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"body":"  "}' "$BASE/api/company/scouts/$SCOUT_HANAKO/reply"
req 38_send_unauth -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$TARO_ID\",\"subject\":\"s\",\"body\":\"b\"}" "$BASE/api/company/scouts"
req 39_credits_after -b "$JARC" "$BASE/api/company/scouts/credits"

# ==================== 候補者スカウト（taro: 開封→返信） ====================
req 40_cand_list -b "$JART" "$BASE/api/scouts"
req 41_unread -b "$JART" "$BASE/api/scouts/unread-count"
req 42_cand_detail -b "$JART" "$BASE/api/scouts/$SCOUT_TARO"
req 43_cand_detail_foreign -b "$JARJ" "$BASE/api/scouts/$SCOUT_TARO"
req 44_cand_detail_missing -b "$JART" "$BASE/api/scouts/$MISSING"
req 45_cand_reply -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d '{"body":"ありがとうございます。ぜひお話を伺いたいです。"}' "$BASE/api/scouts/$SCOUT_TARO/reply"
req 46_cand_reply_empty -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d '{"body":""}' "$BASE/api/scouts/$SCOUT_TARO/reply"
req 47_respond_after_replied -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d '{"response":"interested"}' "$BASE/api/scouts/$SCOUT_TARO/respond"
req 48_cand_detail_after -b "$JART" "$BASE/api/scouts/$SCOUT_TARO"

# ==================== 候補者スカウト（hanako: 興味あり応答） ====================
req 50_respond_interested -b "$JARH" -X POST -H 'Content-Type: application/json' \
  -d '{"response":"interested"}' "$BASE/api/scouts/$SCOUT_HANAKO/respond"
req 51_respond_again -b "$JARH" -X POST -H 'Content-Type: application/json' \
  -d '{"response":"declined"}' "$BASE/api/scouts/$SCOUT_HANAKO/respond"

# ==================== 候補者スカウト（jiro: 一括辞退＋再送） ====================
req 55_bulk_decline -b "$JARJ" -X POST -H 'Content-Type: application/json' \
  -d "{\"scoutIds\":[\"$SCOUT_JIRO\"]}" "$BASE/api/scouts/bulk-decline"
req 56_bulk_respond_noop -b "$JARJ" -X POST -H 'Content-Type: application/json' \
  -d "{\"scoutIds\":[\"$SCOUT_JIRO\"],\"response\":\"interested\"}" "$BASE/api/scouts/bulk-respond"
req 57_bulk_respond_invalid -b "$JARJ" -X POST -H 'Content-Type: application/json' \
  -d "{\"scoutIds\":[\"$SCOUT_JIRO\"],\"response\":\"banana\"}" "$BASE/api/scouts/bulk-respond"
req 58_bulk_missing -b "$JARJ" -X POST -H 'Content-Type: application/json' \
  -d "{\"scoutIds\":[\"$MISSING\"]}" "$BASE/api/scouts/bulk-decline"
req 59_bulk_foreign -b "$JARJ" -X POST -H 'Content-Type: application/json' \
  -d "{\"scoutIds\":[\"$SCOUT_TARO\"]}" "$BASE/api/scouts/bulk-decline"
req 60_cand_list_unauth "$BASE/api/scouts"
# 辞退済みへの再送は resend として成功（resend_count=1）→ 再辞退 → 上限で 400
req 61_send_jiro_resend -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$JIRO_ID\",\"subject\":\"再送のご案内\",\"body\":\"改めてご連絡しました。\"}" \
  "$BASE/api/company/scouts"
SCOUT_JIRO2=$(python3 -c "import json;print(json.load(open('$OUT/61_send_jiro_resend.body')).get('id',''))")
req 62_bulk_decline2 -b "$JARJ" -X POST -H 'Content-Type: application/json' \
  -d "{\"scoutIds\":[\"$SCOUT_JIRO2\"]}" "$BASE/api/scouts/bulk-decline"
req 63_send_jiro_limit -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$JIRO_ID\",\"subject\":\"三度目\",\"body\":\"b\"}" "$BASE/api/company/scouts"

# ==================== スカウト受け入れ設定（taro） ====================
req 65_settings_get -b "$JART" "$BASE/api/scout-settings"
req 66_settings_put_false -b "$JART" -X PUT -H 'Content-Type: application/json' \
  -d '{"acceptingScouts":false}' "$BASE/api/scout-settings"
req 67_settings_get_false -b "$JART" "$BASE/api/scout-settings"
# 受け入れ停止中の候補者への送信は 403（重複チェックより前に判定される）
req 68_send_disabled -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$TARO_ID\",\"subject\":\"s\",\"body\":\"b\"}" "$BASE/api/company/scouts"
req 69_settings_put_true -b "$JART" -X PUT -H 'Content-Type: application/json' \
  -d '{"acceptingScouts":true}' "$BASE/api/scout-settings"
req 70_settings_unauth "$BASE/api/scout-settings"

# ==================== 事後の集計系（決定的な値になるはず） ====================
req 75_quality_after -b "$JARC" "$BASE/api/company/scouts/quality"
req 76_dashboard_after -b "$JARC" "$BASE/api/company/scouts/dashboard"
req 77_credits_final -b "$JARC" "$BASE/api/company/scouts/credits"

# --- 復旧 ---
# 候補者宛 notifications は company cascade で消えないため手動削除
psql_db "delete from notifications where reference_id in ('$SCOUT_TARO','$SCOUT_HANAKO','$SCOUT_JIRO','$SCOUT_JIRO2')" >/dev/null
# taro の scout-settings を事前状態へ（行が無かったなら削除、あったなら値を戻す）
if [[ -z "$TARO_SETTING" ]]; then
  psql_db "delete from user_scout_settings where user_id='$TARO_ID'" >/dev/null
else
  psql_db "update user_scout_settings set accepting_scouts=$TARO_SETTING where user_id='$TARO_ID'" >/dev/null
fi
# seed 企業のテンプレートを API で削除（204 が返ること）
FT_DEL=$(curl -s -o /dev/null -w '%{http_code}' -b "$JARS" -X DELETE "$BASE/api/company/scout-templates/$FT")
cleanup_check "seed 企業テンプレート削除" "204" "$FT_DEL"
# テスト企業ごと削除（scout_messages / replies / templates / credits / ledger / conversations は cascade）
CA_DEL=$(psql_db "with d as (delete from company_accounts where id='$CO' returning 1) select count(*) from d")
cleanup_check "スモーク企業アカウント削除" "1" "$CA_DEL"

cleanup_check "company_accounts 件数" "$CA_N" "$(snap company_accounts)"
cleanup_check "scout_messages 件数" "$MSG_N" "$(snap scout_messages)"
cleanup_check "scout_replies 件数" "$REPLY_N" "$(snap scout_replies)"
cleanup_check "scout_templates 件数" "$TPL_N" "$(snap scout_templates)"
cleanup_check "scout_credits 件数" "$CREDIT_N" "$(snap scout_credits)"
cleanup_check "scout_credit_ledger 件数" "$LEDGER_N" "$(snap scout_credit_ledger)"
cleanup_check "notifications 件数" "$NOTIF_N" "$(snap notifications)"
cleanup_check "conversations 件数" "$CONV_N" "$(snap conversations)"
cleanup_check "user_scout_settings 件数" "$SETTINGS_N" "$(snap user_scout_settings)"

finish
