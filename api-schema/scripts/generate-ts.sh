#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd -- "${SCRIPT_DIR}/.." && pwd)
REPO_ROOT=$(cd -- "${PROJECT_ROOT}/.." && pwd)

TS_TARGET_DIR="${REPO_ROOT}/frontend/src/external/client/api/generated"

echo "Generating TypeScript client from OpenAPI..."

rm -rf "${TS_TARGET_DIR}"
mkdir -p "${TS_TARGET_DIR}"

cd "${PROJECT_ROOT}"
npx @hey-api/openapi-ts \
  --input "${PROJECT_ROOT}/generated/openapi.yaml" \
  --output "${TS_TARGET_DIR}" \
  --client @hey-api/client-fetch

echo "TypeScript client generated at: ${TS_TARGET_DIR}"

# React Query フック生成（orval）。設定は orval.config.ts。
# 出力先の generated/ は clean: true で毎回作り直される（custom-fetch.ts 等の手書きは対象外）。
echo "Generating React Query hooks (orval)..."
npx orval --config "${PROJECT_ROOT}/orval.config.ts"

echo "React Query hooks generated at: ${REPO_ROOT}/frontend/src/external/client/api/orval/generated"
