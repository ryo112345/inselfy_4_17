#!/bin/zsh
# strict-server 移行スモークの共通ヘルパー（docs/strict-server-migration.md 3-2 手順1）。
# 各グループスクリプト（user_group.sh 等）から source して使う。
#
# 前提:
#   - dev DB コンテナ（inselfy-db-1）と backend（port 8081、`go run ./cmd/api`）が起動済み
#   - リポジトリルートの .env に ADMIN_API_KEY があること（bypass-login に使う）
#
# 使い方（グループ移行の前後で同じスクリプトを回して diff する）:
#   ./user_group.sh /tmp/smoke_before   # 移行前の HEAD で
#   ./user_group.sh /tmp/smoke_after    # 移行後に
#   python3 diff_bodies.py /tmp/smoke_before /tmp/smoke_after
set -u

BASE=${BASE:-http://localhost:8081}
DB_CONTAINER=${DB_CONTAINER:-inselfy-db-1}
SMOKE_LIB_DIR="${0:A:h}"
REPO_ROOT="$(cd "$SMOKE_LIB_DIR/../../.." && pwd)"

OUT=${1:?usage: $0 <outdir>}
mkdir -p "$OUT"
JAR="$OUT/cookies.txt"

# 書き込み系ケースが dev データを汚した場合に最後に警告するためのフラグ
CLEANUP_FAILED=0

admin_key() {
  grep '^ADMIN_API_KEY=' "$REPO_ROOT/.env" | cut -d= -f2-
}

# psql_db "<SQL>" — コンテナ内の POSTGRES_USER で実行（-U postgres は存在しないロール）。
# -q でコマンドタグ（DELETE 1 等）を抑制し、RETURNING の行だけを返す。
psql_db() {
  docker exec -i "$DB_CONTAINER" sh -c 'psql -U "$POSTGRES_USER" -d inselfy -qtA' <<<"$1"
}

# req <name> <curl-args...> — ステータスとボディを $OUT/<name>.{status,body} に保存
req() {
  local name=$1
  shift
  curl -s -o "$OUT/$name.body" -w '%{http_code}' "$@" >"$OUT/$name.status"
  printf '%s %s\n' "$(cat "$OUT/$name.status")" "$name"
}

# bypass_login <userID> — 候補者トークン cookie を $JAR に焼く
bypass_login() {
  curl -s -c "$JAR" -X POST -H "X-Admin-Key: $(admin_key)" \
    "$BASE/api/admin/users/$1/bypass-login" >"$OUT/00_login.body"
}

# cleanup_check <説明> <期待値> <実際値> — 後始末の成否を検証（黙って握りつぶさない）
cleanup_check() {
  if [[ "$2" != "$3" ]]; then
    print -u2 "WARN: cleanup failed: $1 (expected=$2 actual=$3)"
    CLEANUP_FAILED=1
  fi
}

# finish — 各グループスクリプトの最後に呼ぶ。後始末失敗なら非ゼロ終了
finish() {
  if [[ $CLEANUP_FAILED -ne 0 ]]; then
    print -u2 "WARN: dev DB may be dirty — 手で復旧してから比較すること"
    exit 1
  fi
  echo "done -> $OUT"
}
