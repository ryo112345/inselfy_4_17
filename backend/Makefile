MIGRATE ?= migrate
MIGRATIONS_DIR ?= migrations
# goverter は go.mod の tool ディレクティブで管理（go tool 実行、インストール不要）。
# oapi-codegen / sqlc は tool 化できない（oapi-codegen は本体の kin-openapi と依存が衝突、
# sqlc はビルドに go >= 1.26 を要求し toolchain が引き上がる）ため、ここでバージョンを
# 固定して go install する（make install-codegen-tools）。バージョンの唯一の情報源はこの Makefile。
OAPI_CODEGEN ?= $(shell go env GOPATH)/bin/oapi-codegen
OAPI_CODEGEN_VERSION ?= v2.6.0
SQLC ?= $(shell go env GOPATH)/bin/sqlc
SQLC_VERSION ?= v1.31.1
GOVERTER ?= go tool goverter
GOLANGCI_LINT ?= $(shell go env GOPATH)/bin/golangci-lint
OPENAPI_SPEC ?= ../api-schema/generated/openapi.yaml
OAPI_CONFIG ?= oapi-codegen.yaml
ENV_FILE ?= ../.env

# Load env vars from project root .env if present
ifneq (,$(wildcard $(ENV_FILE)))
include $(ENV_FILE)
export
endif

DATABASE_URL ?= postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable

.PHONY: migrate-up
migrate-up:
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" up

.PHONY: migrate-down
migrate-down:
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" down 1

.PHONY: migrate-drop
migrate-drop:
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" drop -f

.PHONY: migrate-force
migrate-force:
	@test -n "$(V)" || (echo "usage: make migrate-force V=VERSION"; exit 1)
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" force $(V)

.PHONY: migrate-create
migrate-create:
	@test -n "$(NAME)" || (echo "usage: make migrate-create NAME=description"; exit 1)
	$(MIGRATE) create -ext sql -dir $(MIGRATIONS_DIR) -seq $(NAME)

.PHONY: migrate-version
migrate-version:
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" version

.PHONY: oapi
oapi:
	@test -f $(OPENAPI_SPEC) || (echo "OpenAPI spec not found at $(OPENAPI_SPEC). Run api-schema/scripts/generate-openapi.sh first."; exit 1)
	@mkdir -p internal/adapter/http/generated/openapi
	$(OAPI_CODEGEN) --config $(OAPI_CONFIG) $(OPENAPI_SPEC)
	cp $(OPENAPI_SPEC) internal/adapter/http/generated/openapi/openapi.yaml

.PHONY: sqlc
sqlc:
	$(SQLC) generate

# tool 化できない codegen ツールの導入（CI・ローカル共通）。
# sqlc はビルドに go >= 1.26 を要求する（生成コードは sqlc 自体のバージョンで決まり、
# ビルドに使う Go には依存しない）
.PHONY: install-codegen-tools
install-codegen-tools:
	go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@$(OAPI_CODEGEN_VERSION)
	GOTOOLCHAIN=go1.26.0 go install github.com/sqlc-dev/sqlc/cmd/sqlc@$(SQLC_VERSION)

# Generates struct-to-struct mappers from the `// goverter:converter` interfaces
# (e.g. internal/adapter/http/presenter/*_converter.go). goverter は go.mod の
# tool ディレクティブで管理されるため、追加インストールは不要。
.PHONY: goverter
goverter:
	$(GOVERTER) gen -build-tags "" ./...

.PHONY: run
run:
	go run ./cmd/api

.PHONY: build
build:
	go build ./...

.PHONY: test
test:
	go test ./...

# CI (octocov) と同じ形式でカバレッジを計測する。結果は go tool cover -func=coverage.out で確認
.PHONY: test-cover
test-cover:
	go test ./... -coverprofile=coverage.out

# Runs the full linter suite (.golangci.yml): standard linters + bug/security/
# resource-leak detectors (gosec, errorlint, gocritic, ...) + gofumpt/goimports,
# plus depguard for the layer boundary: controllers must not import pgx; only
# admin_*_controller.go may use the pool directly. Install:
#   go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.12.2
.PHONY: lint
lint:
	$(GOLANGCI_LINT) run ./...

# バックエンド変更後の一発検証（CLAUDE.md 参照）。CI と同じ build/lint/test を回す
.PHONY: check
check: build lint test

# 生成元（TypeSpec / SQL / converter 定義）を触ったらこれ一発で全再生成する。
# 個別コマンドの打ち忘れ（＝生成物ドリフト）を防ぐ入口。検査だけしたい場合は
# scripts/check-generated-drift.sh（CI と同じ）を使う
.PHONY: generate-all
generate-all:
	cd ../api-schema && npm run generate
	$(MAKE) oapi sqlc goverter
