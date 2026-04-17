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
