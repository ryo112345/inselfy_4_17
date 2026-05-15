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

WORKDIR /app

# Backend
COPY --from=backend-builder /api ./api
COPY backend/migrations ./migrations

# Frontend (Next.js standalone)
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

EXPOSE 8080

CMD ["sh", "-c", "./api & cd /app/frontend && HOSTNAME=0.0.0.0 PORT=8080 INTERNAL_API_URL=http://127.0.0.1:8081 node server.js"]
