MIGRATE ?= migrate
MIGRATIONS_DIR ?= migrations
OAPI_CODEGEN ?= $(shell go env GOPATH)/bin/oapi-codegen
SQLC ?= $(shell go env GOPATH)/bin/sqlc
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

.PHONY: sqlc
sqlc:
	$(SQLC) generate

.PHONY: run
run:
	go run ./cmd/api

.PHONY: build
build:
	go build ./...

.PHONY: test
test:
	go test ./...
