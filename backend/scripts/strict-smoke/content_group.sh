#!/bin/zsh
# wire_content グループ（post/article、24 operation）の前後比較スモーク。
# 使い方・前提は lib.sh のヘッダーを参照。
#
# 書き込み系ケースは全て自前で作成したリソースに対して行い、スクリプト内の
# API 呼び出し（delete）で復旧する。最後に posts / articles の件数が実行前と
# 一致することを検証する。Stripe を実際に呼ぶ経路（有料記事の checkout 成功）は
# 決定的でないため踏まない（無料記事 400 / 不在 404 / 未認証 401 のみ）。
source "${0:A:h}/lib.sh"

ME_ID="10000000-0000-0000-0000-000000000001" # taro_yamada（seed 記事の著者）
SEED_POST="99990000-0000-0000-0000-000000000001"
FOREIGN_POST="99990000-0000-0000-0000-000000000009" # 他ユーザーの seed 投稿
SEED_ARTICLE="cda8b06e-ef85-4665-84b6-03f41f6a4c21" # taro_yamada の無料公開記事
MISSING="00000000-0000-0000-0000-000000000000"
COMPANY_EMAIL="admin@inselfy.example.com"
COMPANY_PASSWORD="password123"
JAR2="$OUT/company_cookies.txt"

# --- 復旧検証用スナップショット ---
POSTS_BEFORE=$(psql_db "select count(*) from posts")
ARTICLES_BEFORE=$(psql_db "select count(*) from articles")

bypass_login "$ME_ID"

# =========================== Posts: reads ===========================
req 01_timeline "$BASE/api/posts?limit=5"
req 02_timeline_viewer "$BASE/api/posts?limit=5&viewerId=$ME_ID"
req 03_posts_by_user "$BASE/api/posts/users/$ME_ID?limit=5"
req 04_liked_by_user "$BASE/api/posts/users/$ME_ID/likes"
req 05_get_seed_post "$BASE/api/posts/$SEED_POST?viewerId=$ME_ID"
req 06_get_missing_post "$BASE/api/posts/$MISSING"

# =========================== Posts: writes ==========================
req 07_post_create -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"content":"strict移行スモーク投稿"}' "$BASE/api/posts"
POST_ID=$(python3 -c "import json;print(json.load(open('$OUT/07_post_create.body')).get('id',''))" 2>/dev/null)
req 08_post_create_unauth -X POST -H 'Content-Type: application/json' \
  -d '{"content":"x"}' "$BASE/api/posts"
req 09_post_create_empty -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"content":""}' "$BASE/api/posts"
req 10_quote_create -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d "{\"content\":\"引用スモーク\",\"quotePostId\":\"$POST_ID\"}" "$BASE/api/posts"
QUOTE_ID=$(python3 -c "import json;print(json.load(open('$OUT/10_quote_create.body')).get('id',''))" 2>/dev/null)

req 11_like_on -b "$JAR" -X POST "$BASE/api/posts/$POST_ID/like"
req 12_like_off -b "$JAR" -X POST "$BASE/api/posts/$POST_ID/like"
req 13_repost_on -b "$JAR" -X POST "$BASE/api/posts/$POST_ID/repost"
req 14_repost_off -b "$JAR" -X POST "$BASE/api/posts/$POST_ID/repost"
req 15_like_missing -b "$JAR" -X POST "$BASE/api/posts/$MISSING/like"

req 16_comment_create -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"content":"スモークコメント"}' "$BASE/api/posts/$POST_ID/comments"
COMMENT_ID=$(python3 -c "import json;print(json.load(open('$OUT/16_comment_create.body')).get('id',''))" 2>/dev/null)
req 17_comments_list "$BASE/api/posts/$POST_ID/comments"
req 18_comment_create_unauth -X POST -H 'Content-Type: application/json' \
  -d '{"content":"x"}' "$BASE/api/posts/$POST_ID/comments"
req 19_comment_delete -b "$JAR" -X DELETE "$BASE/api/posts/comments/$COMMENT_ID"
req 20_comment_delete_again -b "$JAR" -X DELETE "$BASE/api/posts/comments/$COMMENT_ID"

req 21_post_delete_foreign -b "$JAR" -X DELETE "$BASE/api/posts/$FOREIGN_POST"
req 22_quote_delete -b "$JAR" -X DELETE "$BASE/api/posts/$QUOTE_ID"
req 23_post_delete -b "$JAR" -X DELETE "$BASE/api/posts/$POST_ID"
req 24_post_delete_again -b "$JAR" -X DELETE "$BASE/api/posts/$POST_ID"

# ========================== Articles: reads =========================
req 30_article_list "$BASE/api/articles"
req 31_article_list_limit "$BASE/api/articles?limit=1"
req 32_article_get "$BASE/api/articles/$SEED_ARTICLE"
req 33_article_get_auth -b "$JAR" "$BASE/api/articles/$SEED_ARTICLE" # optional 認証: isAuthor=true
req 34_article_get_missing "$BASE/api/articles/$MISSING"
req 35_articles_mine -b "$JAR" "$BASE/api/articles/mine"
req 36_articles_mine_unauth "$BASE/api/articles/mine"

# ================= Articles: writes（ユーザー著者） =================
req 37_article_create -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"title":"strict移行スモーク記事","body":"本文です。","isPaid":false,"priceYen":0,"tags":["スモーク"]}' \
  "$BASE/api/articles"
ART_ID=$(python3 -c "import json;print(json.load(open('$OUT/37_article_create.body')).get('id',''))" 2>/dev/null)
req 38_article_create_empty_title -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"title":"","body":"x","isPaid":false,"priceYen":0,"tags":[]}' "$BASE/api/articles"
req 39_article_create_unauth -X POST -H 'Content-Type: application/json' \
  -d '{"title":"x","body":"x","isPaid":false,"priceYen":0,"tags":[]}' "$BASE/api/articles"
req 40_article_update -b "$JAR" -X PUT -H 'Content-Type: application/json' \
  -d '{"title":"strict移行スモーク記事(更新)","body":"更新本文。","isPaid":false,"priceYen":0,"tags":["スモーク"]}' \
  "$BASE/api/articles/$ART_ID"
req 41_article_update_missing -b "$JAR" -X PUT -H 'Content-Type: application/json' \
  -d '{"title":"x","body":"x","isPaid":false,"priceYen":0,"tags":[]}' "$BASE/api/articles/$MISSING"
req 42_article_publish -b "$JAR" -X POST "$BASE/api/articles/$ART_ID/publish"
req 43_article_publish_missing -b "$JAR" -X POST "$BASE/api/articles/$MISSING/publish"

# checkout（Stripe 呼び出しに到達しない決定的ケースのみ）
req 44_checkout_free -b "$JAR" -X POST "$BASE/api/articles/$SEED_ARTICLE/checkout"
req 45_checkout_missing -b "$JAR" -X POST "$BASE/api/articles/$MISSING/checkout"
req 46_checkout_unauth -X POST "$BASE/api/articles/$SEED_ARTICLE/checkout"

# ================== 記事画像アップロード (multipart) =================
PNG="$OUT/px.png"
python3 -c "import base64;open('$PNG','wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='))"
req 47_upload_image -b "$JAR" -X POST -F "file=@$PNG;type=image/png" "$BASE/api/articles/upload-image"
req 48_upload_wrong_field -b "$JAR" -X POST -F "wrong=@$PNG;type=image/png" "$BASE/api/articles/upload-image"
req 49_upload_texttype -b "$JAR" -X POST -F "file=@$PNG;type=text/plain" "$BASE/api/articles/upload-image"
req 50_upload_unauth -X POST -F "file=@$PNG;type=image/png" "$BASE/api/articles/upload-image"

# ======================= 企業著者の記事 =============================
curl -s -c "$JAR2" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$COMPANY_EMAIL\",\"password\":\"$COMPANY_PASSWORD\"}" \
  "$BASE/api/company/auth/login" >"$OUT/60_company_login.body"
req 61_co_article_create -b "$JAR2" -X POST -H 'Content-Type: application/json' \
  -d '{"title":"企業スモーク記事","body":"企業本文。","isPaid":false,"priceYen":0,"tags":[]}' \
  "$BASE/api/company/articles"
CO_ART_ID=$(python3 -c "import json;print(json.load(open('$OUT/61_co_article_create.body')).get('id',''))" 2>/dev/null)
req 62_co_article_update -b "$JAR2" -X PUT -H 'Content-Type: application/json' \
  -d '{"title":"企業スモーク記事(更新)","body":"企業更新本文。","isPaid":false,"priceYen":0,"tags":[]}' \
  "$BASE/api/company/articles/$CO_ART_ID"
req 63_co_article_publish -b "$JAR2" -X POST "$BASE/api/company/articles/$CO_ART_ID/publish"
# 著者不一致（ユーザー→企業記事 / 企業→ユーザー記事）
req 64_article_update_foreign -b "$JAR" -X PUT -H 'Content-Type: application/json' \
  -d '{"title":"x","body":"x","isPaid":false,"priceYen":0,"tags":[]}' "$BASE/api/articles/$CO_ART_ID"
req 65_co_article_update_foreign -b "$JAR2" -X PUT -H 'Content-Type: application/json' \
  -d '{"title":"x","body":"x","isPaid":false,"priceYen":0,"tags":[]}' "$BASE/api/company/articles/$SEED_ARTICLE"
req 66_co_article_create_unauth -X POST -H 'Content-Type: application/json' \
  -d '{"title":"x","body":"x","isPaid":false,"priceYen":0,"tags":[]}' "$BASE/api/company/articles"
req 67_co_article_delete -b "$JAR2" -X DELETE "$BASE/api/company/articles/$CO_ART_ID"
req 68_co_article_delete_again -b "$JAR2" -X DELETE "$BASE/api/company/articles/$CO_ART_ID"

# ============ ユーザー記事の削除（復旧を兼ねる） ============
req 51_article_delete -b "$JAR" -X DELETE "$BASE/api/articles/$ART_ID"
req 52_article_delete_again -b "$JAR" -X DELETE "$BASE/api/articles/$ART_ID"

# --- 復旧検証（作成物は全て API 削除済みのはず） ---
POSTS_AFTER=$(psql_db "select count(*) from posts")
ARTICLES_AFTER=$(psql_db "select count(*) from articles")
cleanup_check "posts 件数復元" "$POSTS_BEFORE" "$POSTS_AFTER"
cleanup_check "articles 件数復元" "$ARTICLES_BEFORE" "$ARTICLES_AFTER"

# アップロードした記事画像ファイルを削除
UPLOADED_URL=$(python3 -c "import json;print(json.load(open('$OUT/47_upload_image.body')).get('url',''))" 2>/dev/null)
if [[ -n "$UPLOADED_URL" ]]; then
  UPLOADED_FILE="$REPO_ROOT/backend/uploads/${UPLOADED_URL#/api/uploads/}"
  rm -f "$UPLOADED_FILE"
  cleanup_check "アップロードファイル削除" "gone" "$([[ -e $UPLOADED_FILE ]] && echo exists || echo gone)"
fi

finish
