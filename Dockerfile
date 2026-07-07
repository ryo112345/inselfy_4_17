# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
RUN NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID} npm run build

# Stage 2: Build backend
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /api ./cmd/api

# Stage 3: Runtime
FROM node:22-alpine
RUN apk add --no-cache ca-certificates tzdata

# ランタイムで npm/npx/corepack/yarn は使わない（起動は node server.js のみ）。
# ベースイメージ同梱の npm CLI はその依存（picomatch/sigstore 等）が脆弱性スキャンに
# 引っかかり続けるため削除する。攻撃面の縮小も兼ねる
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
    /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

WORKDIR /app

# Backend
COPY --from=backend-builder /api ./api
COPY backend/migrations ./migrations

# Frontend (Next.js standalone)
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# 起動スクリプト: API/node のどちらかが死んだらコンテナごと落とす（詳細は docker/start.sh）
COPY docker/start.sh ./start.sh

EXPOSE 8080

CMD ["sh", "/app/start.sh"]
