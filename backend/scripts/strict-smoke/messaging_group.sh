#!/bin/zsh
# wire_messaging グループ（候補者メッセージ 7、企業メッセージ 7、
# ユーザー通知 4、企業通知 4。計22ルート）の前後比較スモーク。
# 使い方・前提は lib.sh のヘッダーを参照。
#
# - 候補者間会話（taro↔hanako）はスクリプトが新規作成し、末尾で削除する
#   （事前に同ペアの会話が存在する場合は削除しない＝既存データ保護）
# - 企業側は register で作った専用企業に閉じ、末尾でアカウントごと削除
#   （company_candidate 会話・企業通知は FK cascade で消える）
# - 通知はスクリプトが SQL で投入し、末尾で reference_id 指定で削除。
#   read-all が既存の未読通知を既読化してしまうため、taro の未読 id を
#   事前記録して復旧する
# - 会話の非参加者アクセスは ErrNotParticipant = 400（403 ではない）。
#   存在しない会話 ID も参加者検索が外れるため 400 になる（挙動維持）
source "${0:A:h}/lib.sh"

SEED_EMAIL="admin@inselfy.example.com"
SEED_PASSWORD="password123"
TARO_ID="10000000-0000-0000-0000-000000000001"   # 会話の起点・通知テスト
HANAKO_ID="10000000-0000-0000-0000-000000000002" # 会話の相手
JIRO_ID="10000000-0000-0000-0000-000000000003"   # 非参加者（400 を踏む）
MISSING="00000000-0000-0000-0000-000000000000"
REF1="99999999-0000-0000-0000-000000000001"      # 通知削除用の目印
REF2="99999999-0000-0000-0000-000000000002"
SMOKE_EMAIL="smoke-messaging-group@example.test"
JARC="$OUT/co_cookies.txt"    # テスト企業
JARS="$OUT/seed_cookies.txt"  # seed 企業（非参加者 400 用）
JART="$OUT/taro_cookies.txt"
JARH="$OUT/hanako_cookies.txt"
JARJ="$OUT/jiro_cookies.txt"

# --- 復旧検証用スナップショット ---
snap() { psql_db "select count(*) from $1"; }
CONV_N=$(snap conversations)
PART_N=$(snap conversation_participants)
MSG_N=$(snap messages)
NOTIF_N=$(snap notifications)
CA_N=$(snap company_accounts)
PRE_PAIR=$(psql_db "select id from conversations where conversation_type='candidate_candidate' and participant1_id='$TARO_ID' and participant2_id='$HANAKO_ID'")
TARO_UNREAD_IDS=$(psql_db "select string_agg(id::text, ',') from notifications where user_id='$TARO_ID' and is_read=false")

# --- セットアップ: テスト企業を作成して承認・ログイン。seed 企業と候補者3人もログイン ---
curl -s -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"password123\",\"companyName\":\"メッセージ検証株式会社\",\"contactPersonName\":\"検証 太郎\",\"phoneNumber\":\"03-0000-0000\"}" \
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

# ==================== 候補者メッセージ（taro↔hanako） ====================
req 01_cand_start -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$HANAKO_ID\",\"body\":\"はじめまして。記事を拝見してご連絡しました。\"}" \
  "$BASE/api/messages/conversations"
CONV=$(python3 -c "import json;print(json.load(open('$OUT/01_cand_start.body')).get('id',''))")
req 02_cand_start_existing -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$HANAKO_ID\",\"body\":\"二通目\"}" "$BASE/api/messages/conversations"
req 03_cand_start_self -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$TARO_ID\",\"body\":\"自分宛\"}" "$BASE/api/messages/conversations"
req 04_cand_start_empty_body -b "$JART" -X POST -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$HANAKO_ID\",\"body\":\"   \"}" "$BASE/api/messages/conversations"
req 05_cand_convs -b "$JART" "$BASE/api/messages/conversations"
req 06_cand_convs_paged -b "$JART" "$BASE/api/messages/conversations?limit=1&offset=0"
req 07_cand_convs_limit0 -b "$JART" "$BASE/api/messages/conversations?limit=0"
req 08_cand_get -b "$JART" "$BASE/api/messages/conversations/$CONV"
req 09_cand_get_foreign -b "$JARJ" "$BASE/api/messages/conversations/$CONV"
req 10_cand_get_missing -b "$JART" "$BASE/api/messages/conversations/$MISSING"
req 11_cand_msgs -b "$JART" "$BASE/api/messages/conversations/$CONV/messages"
req 12_cand_send -b "$JARH" -X POST -H 'Content-Type: application/json' \
  -d '{"body":"ご連絡ありがとうございます。ぜひお話しましょう。"}' \
  "$BASE/api/messages/conversations/$CONV/messages"
req 13_cand_send_empty -b "$JARH" -X POST -H 'Content-Type: application/json' \
  -d '{"body":"  "}' "$BASE/api/messages/conversations/$CONV/messages"
req 14_cand_send_foreign -b "$JARJ" -X POST -H 'Content-Type: application/json' \
  -d '{"body":"部外者"}' "$BASE/api/messages/conversations/$CONV/messages"
req 15_cand_read -b "$JART" -X POST "$BASE/api/messages/conversations/$CONV/read"
req 16_cand_read_foreign -b "$JARJ" -X POST "$BASE/api/messages/conversations/$CONV/read"
req 17_cand_read_missing -b "$JART" -X POST "$BASE/api/messages/conversations/$MISSING/read"
req 18_cand_unread -b "$JART" "$BASE/api/messages/unread-count"
req 19_cand_unauth "$BASE/api/messages/conversations"

# ==================== 企業メッセージ（テスト企業↔taro） ====================
req 20_co_start -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$TARO_ID\",\"body\":\"弊社の求人にご興味ありませんか。\"}" \
  "$BASE/api/company/messages/conversations"
CCONV=$(python3 -c "import json;print(json.load(open('$OUT/20_co_start.body')).get('id',''))")
req 21_co_start_dup -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$TARO_ID\",\"body\":\"二通目\"}" "$BASE/api/company/messages/conversations"
req 22_co_start_empty_body -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d "{\"candidateId\":\"$TARO_ID\",\"body\":\"\"}" "$BASE/api/company/messages/conversations"
req 23_co_convs -b "$JARC" "$BASE/api/company/messages/conversations"
req 24_co_get -b "$JARC" "$BASE/api/company/messages/conversations/$CCONV"
req 25_co_get_foreign -b "$JARS" "$BASE/api/company/messages/conversations/$CCONV"
req 26_co_get_missing -b "$JARC" "$BASE/api/company/messages/conversations/$MISSING"
req 27_co_msgs -b "$JARC" "$BASE/api/company/messages/conversations/$CCONV/messages"
req 28_co_send -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"body":"カジュアル面談も可能です。"}' \
  "$BASE/api/company/messages/conversations/$CCONV/messages"
req 29_co_send_empty -b "$JARC" -X POST -H 'Content-Type: application/json' \
  -d '{"body":" "}' "$BASE/api/company/messages/conversations/$CCONV/messages"
req 30_co_read -b "$JARC" -X POST "$BASE/api/company/messages/conversations/$CCONV/read"
req 31_co_unread -b "$JARC" "$BASE/api/company/messages/unread-count"
req 32_co_unauth "$BASE/api/company/messages/conversations"

# ==================== 会話種別をまたぐアクセス ====================
# taro は company_candidate 会話にも candidate として参加している
req 33_cand_get_company_conv -b "$JART" "$BASE/api/messages/conversations/$CCONV"
req 34_cand_convs_mixed -b "$JART" "$BASE/api/messages/conversations"
# 企業は candidate_candidate 会話の参加者ではない → 400
req 35_co_get_candidate_conv -b "$JARC" "$BASE/api/company/messages/conversations/$CONV"

# ==================== ユーザー通知（taro） ====================
N1=$(psql_db "insert into notifications (user_id, type, title, body, reference_id) values ('$TARO_ID','scout_received','スモーク通知1','本文1','$REF1') returning id")
N2=$(psql_db "insert into notifications (user_id, type, title, body, reference_id) values ('$TARO_ID','scout_replied','スモーク通知2','本文2','$REF1') returning id")
req 40_notif_list -b "$JART" "$BASE/api/notifications"
req 41_notif_list_limit -b "$JART" "$BASE/api/notifications?limit=1"
req 42_notif_unread -b "$JART" "$BASE/api/notifications/unread-count"
req 43_notif_read -b "$JART" -X POST "$BASE/api/notifications/$N1/read"
req 44_notif_read_again -b "$JART" -X POST "$BASE/api/notifications/$N1/read"
req 45_notif_read_missing -b "$JART" -X POST "$BASE/api/notifications/$MISSING/read"
req 46_notif_read_foreign -b "$JARJ" -X POST "$BASE/api/notifications/$N2/read"
req 47_notif_read_all -b "$JART" -X POST "$BASE/api/notifications/read-all"
req 48_notif_unread_after -b "$JART" "$BASE/api/notifications/unread-count"
req 49_notif_list_after -b "$JART" "$BASE/api/notifications"
req 50_notif_unauth "$BASE/api/notifications"

# ==================== 企業通知（テスト企業） ====================
CN1=$(psql_db "insert into notifications (company_id, type, title, body, reference_id) values ('$CO','credit_replenished','スモーク企業通知','本文','$REF2') returning id")
req 51_co_notif_list -b "$JARC" "$BASE/api/company/notifications"
req 52_co_notif_unread -b "$JARC" "$BASE/api/company/notifications/unread-count"
req 53_co_notif_read -b "$JARC" -X POST "$BASE/api/company/notifications/$CN1/read"
req 54_co_notif_read_missing -b "$JARC" -X POST "$BASE/api/company/notifications/$MISSING/read"
req 55_co_notif_read_all -b "$JARC" -X POST "$BASE/api/company/notifications/read-all"
req 56_co_notif_unread_after -b "$JARC" "$BASE/api/company/notifications/unread-count"
req 57_co_notif_unauth "$BASE/api/company/notifications"

# --- 復旧 ---
# 候補者間会話（事前に存在しなかった場合のみ削除。participants/messages は cascade）
if [[ -z "$PRE_PAIR" && -n "$CONV" ]]; then
  psql_db "delete from conversations where id='$CONV'" >/dev/null
fi
# スクリプトが投入した通知を削除（taro 宛 2 件。企業宛は企業削除で cascade）
psql_db "delete from notifications where reference_id='$REF1'" >/dev/null
# read-all で既読化してしまった taro の既存未読通知を復旧
if [[ -n "$TARO_UNREAD_IDS" ]]; then
  psql_db "update notifications set is_read=false where id in ('${TARO_UNREAD_IDS//,/','}')" >/dev/null
fi
# テスト企業ごと削除（company_candidate 会話・企業通知・refresh トークンは cascade）
CA_DEL=$(psql_db "with d as (delete from company_accounts where id='$CO' returning 1) select count(*) from d")
cleanup_check "スモーク企業アカウント削除" "1" "$CA_DEL"

cleanup_check "conversations 件数" "$CONV_N" "$(snap conversations)"
cleanup_check "conversation_participants 件数" "$PART_N" "$(snap conversation_participants)"
cleanup_check "messages 件数" "$MSG_N" "$(snap messages)"
cleanup_check "notifications 件数" "$NOTIF_N" "$(snap notifications)"
cleanup_check "company_accounts 件数" "$CA_N" "$(snap company_accounts)"

finish
