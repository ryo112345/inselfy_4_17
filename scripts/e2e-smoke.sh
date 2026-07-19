#!/usr/bin/env bash
# compose ベースの E2E スモークテスト (C7)。
# 前提: docker compose --profile e2e up -d --build 済み（CI: .github/workflows/e2e-smoke.yml）。
#
# 狙いは「単体で緑でも結合で死ぬ」系の検知だけ:
#   - DI 配線ミス（コンパイルは通るが起動・実行時に死ぬ）
#   - front → API プロキシと API ポート/パスのずれ
#   - マイグレーション直後のスキーマと sqlc の期待のずれ
# シナリオは意図的に薄く保つ（E2E は増やすほど flaky になる。backlog C7 参照）。
# 書き込みは行わない（ローカルでは開発用 DB を共有するため read-only 前提）。
set -u

FRONT=${FRONT:-http://localhost:18080}
API=${API:-http://localhost:18081}
fail=0

# --- 起動待ち（最大120秒）---
echo "waiting for $API/readyz ..."
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null "$API/readyz" 2>/dev/null; then
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "NG: API が 120 秒以内に ready にならない"
    exit 1
  fi
  sleep 2
done

check_status() { # 名前 URL 期待ステータス
  local name=$1 url=$2 expected=$3 got
  got=$(curl -s -o /dev/null -w '%{http_code}' "$url")
  if [ "$got" = "$expected" ]; then
    echo "OK: $name ($got)"
  else
    echo "NG: $name expected=$expected got=$got"
    fail=1
  fi
}

check_list_shape() { # 名前 URL — {items: array, total: number} 契約の検証
  local name=$1 url=$2
  if curl -fsS "$url" | jq -e '(.items | type == "array") and (.total | type == "number")' >/dev/null 2>&1; then
    echo "OK: $name ({items,total} 契約)"
  else
    echo "NG: $name レスポンス形が {items,total} でない"
    fail=1
  fi
}

# liveness / readiness
check_status "API /healthz" "$API/healthz" 200
check_status "API /readyz " "$API/readyz" 200

# Cloud Run の probe が通る経路（front プロキシ → /api/healthz|readyz）。
# 本番の startup/liveness probe は port 8080 にしか届かないため、この経路が生命線（C10）
check_status "front経由 /api/healthz" "$FRONT/api/healthz" 200
check_status "front経由 /api/readyz " "$FRONT/api/readyz" 200

# front (Next.js) が応答する
check_status "front /     " "$FRONT/" 200

# front → API プロキシ → DB の全チェーン
check_list_shape "front経由 /api/jobs" "$FRONT/api/jobs"

# API 直: 公開エンドポイントが DB まで届く
check_list_shape "API直 /api/articles" "$API/api/articles"

# 認証ミドルウェアの配線（トークン無しの保護ルートは 401）
check_status "未認証 /api/applications" "$API/api/applications" 401

# レスポンス契約検証（compose の app は OPENAPI_VALIDATE_RESPONSES=true で起動）:
# 上のチェックで叩いた分に契約違反があれば validator が ERROR ログに出すので検知する。
# compose 外で API を直接立てて回している場合（app コンテナ無し）はスキップ
if docker compose --profile e2e ps --status running app 2>/dev/null | grep -q app; then
  violations=$(docker compose --profile e2e logs app 2>/dev/null | grep "response contract violation" || true)
  if [ -n "$violations" ]; then
    echo "NG: レスポンス契約違反がログに出ている:"
    echo "$violations"
    fail=1
  else
    echo "OK: レスポンス契約違反なし"
  fi
fi

if [ "$fail" -ne 0 ]; then
  echo "--- SMOKE FAILED ---"
fi
exit $fail
