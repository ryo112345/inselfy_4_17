#!/bin/bash

# 生成コードのドリフト検査。
# TypeSpec → OpenAPI → TS クライアント / oapi-codegen、および sqlc / goverter を
# 全て再生成し、コミット済みの生成物と差分が出たら非ゼロで終了する。
# CI と手元の両方で使う想定（手元では生成物パス以外の変更は無視される）。

set -euo pipefail

ROOT=$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "${ROOT}"

GENERATED_PATHSPECS=(
  "api-schema/generated"
  "frontend/src/external/client/api/generated"
  "frontend/src/external/client/api/orval/generated"
  "backend/internal/adapter/http/generated"
  "backend/internal/adapter/gateway/db/sqlc/generated"
  ":(glob)backend/**/*_converter.gen.go"
)

echo "==> Regenerating OpenAPI spec + TypeScript client from TypeSpec..."
(cd api-schema && npm run generate)

echo "==> Regenerating Go code (oapi-codegen / sqlc / goverter)..."
(cd backend && make oapi && make sqlc && make goverter)

echo "==> Checking generated code for drift..."
if ! git diff --exit-code -- "${GENERATED_PATHSPECS[@]}"; then
  echo ""
  echo "ERROR: generated code is out of sync with its sources." >&2
  echo "Run scripts/check-generated-drift.sh locally and commit the regenerated files." >&2
  exit 1
fi

UNTRACKED=$(git ls-files --others --exclude-standard -- "${GENERATED_PATHSPECS[@]}")
if [ -n "${UNTRACKED}" ]; then
  echo "ERROR: generated files are not committed:" >&2
  echo "${UNTRACKED}" >&2
  exit 1
fi

echo "OK: no drift detected."
