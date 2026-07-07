package usecase

import (
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
)

// isNotFound reports whether err represents the domain-level "not found"
// condition. Shared by interactors (scout, messaging, ...) that treat a
// missing row as a normal branch rather than a failure.
func isNotFound(err error) bool {
	return err != nil && err.Error() == domainerr.ErrNotFound.Error()
}
