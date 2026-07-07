MIGRATE ?= migrate
MIGRATIONS_DIR ?= migrations
OAPI_CODEGEN ?= $(shell go env GOPATH)/bin/oapi-codegen
SQLC ?= $(shell go env GOPATH)/bin/sqlc
GOVERTER ?= $(shell go env GOPATH)/bin/goverter
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

# Generates struct-to-struct mappers from the `// goverter:converter` interfaces
# (e.g. internal/adapter/http/presenter/*_converter.go). The goverter binary must
# be built with the same Go version as the module; install with:
#   GOTOOLCHAIN=go1.25.0 go install github.com/jmattheis/goverter/cmd/goverter@v1.9.4
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

# Enforces the layer boundary (.golangci.yml depguard): controllers must not
# import pgx; only admin_*_controller.go may use the pool directly. Install:
#   go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.12.2
.PHONY: lint
lint:
	$(GOLANGCI_LINT) run ./...
