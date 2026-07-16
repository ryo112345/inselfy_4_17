package controller

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

// StrictServer implements the generated StrictServerInterface incrementally
// during the strict-server migration (docs/strict-server-migration.md Phase 3).
// The embedded interface satisfies the operations whose feature group has not
// migrated yet; those are still served by the echo router and never dispatched
// here, so the nil embed is unreachable. Once every group has migrated, the
// embed is removed and conformance becomes a compile-time check again.
type StrictServer struct {
	openapi.StrictServerInterface
}

// NewStrictServer wires controllers into the generated StrictServerInterface.
// Feature groups add their controllers here as they migrate off echo.
func NewStrictServer() *StrictServer {
	return &StrictServer{}
}
