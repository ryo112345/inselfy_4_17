#!/bin/sh
# API (Go) と Next.js を同一コンテナで起動する（Cloud Run 1サービス・無料枠運用のための同居）。
# 旧来の `./api & ... node server.js` 起動だと、バックグラウンドの API が死んでも
# node が生きている限り Cloud Run はコンテナを健全と判定し続ける（リクエストは 502 なのに
# 再起動されない）。どちらか一方の終了を検知したらコンテナごと終了し、Cloud Run に再起動を任せる。
#
# 注意: busybox ash の `wait -n` は「wait 実行前に終了済みのジョブ」を拾わないため
# （起動直後に片方が即死すると永遠に待ち続ける）、レースのない kill -0 ポーリングで監視する。
set -u

/app/api &
api_pid=$!

cd /app/frontend
HOSTNAME=0.0.0.0 PORT="${PORT:-8080}" INTERNAL_API_URL=http://127.0.0.1:8081 node server.js &
node_pid=$!

# Cloud Run からの SIGTERM を両プロセスへ転送する（グレースフルシャットダウン）。
# sleep はシグナルで中断されるので、ループが即座に終了検知に進む。
trap 'kill -TERM "$api_pid" "$node_pid" 2>/dev/null' TERM INT

# どちらか一方が終了するまで監視し、先に死んだ方の終了コードを引き継ぐ
while :; do
  if ! kill -0 "$api_pid" 2>/dev/null; then
    wait "$api_pid"
    status=$?
    break
  fi
  if ! kill -0 "$node_pid" 2>/dev/null; then
    wait "$node_pid"
    status=$?
    break
  fi
  sleep 5
done

# 残った方も止めてからコンテナごと終了する
kill -TERM "$api_pid" "$node_pid" 2>/dev/null
wait
exit "$status"
