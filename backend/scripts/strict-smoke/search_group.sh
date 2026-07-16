#!/bin/zsh
# wire_search グループ（横断検索、5 operation）の前後比較スモーク。
# 使い方・前提は lib.sh のヘッダーを参照。読み取り専用のため dev データ復旧は不要。
source "${0:A:h}/lib.sh"

ME_ID="10000000-0000-0000-0000-000000000001" # taro_yamada（seed）

bypass_login "$ME_ID"

# --- 横断検索 ---
req 01_all -b "$JAR" -G --data-urlencode "q=エンジニア" "$BASE/api/search"
req 02_all_limit_per_type -b "$JAR" -G --data-urlencode "q=エンジニア" -d "limitPerType=1" "$BASE/api/search"
req 03_all_unauth -G --data-urlencode "q=エンジニア" "$BASE/api/search"
req 04_all_missing_q -b "$JAR" "$BASE/api/search"
req 05_all_empty_q -b "$JAR" -G -d "q=" "$BASE/api/search"
req 06_all_space_q -b "$JAR" -G --data-urlencode "q=  " "$BASE/api/search"
req 07_all_long_q -b "$JAR" -G --data-urlencode "q=$(python3 -c 'print("あ"*101)')" "$BASE/api/search"

# --- カテゴリ別 ---
req 10_users -b "$JAR" -G --data-urlencode "q=山田" "$BASE/api/search/users"
req 11_users_paging -b "$JAR" -G --data-urlencode "q=a" -d "limit=1&offset=1" "$BASE/api/search/users"
req 12_users_unauth -G --data-urlencode "q=山田" "$BASE/api/search/users"
req 13_articles -b "$JAR" -G --data-urlencode "q=職務経歴書" "$BASE/api/search/articles"
req 14_posts -b "$JAR" -G --data-urlencode "q=Go" "$BASE/api/search/posts"
req 15_jobs -b "$JAR" -G --data-urlencode "q=エンジニア" "$BASE/api/search/jobs"
req 16_jobs_nohit -b "$JAR" -G --data-urlencode "q=zzz_no_such_keyword" "$BASE/api/search/jobs"
req 17_posts_bad_limit -b "$JAR" -G --data-urlencode "q=Go" -d "limit=abc" "$BASE/api/search/posts"

finish
