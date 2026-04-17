// Package errors defines domain-level error values.
package errors

import "errors"

var (
	// ErrNotFound indicates resource not found.
	ErrNotFound = errors.New("not found")
	// ErrConflict indicates a uniqueness or state conflict.
	ErrConflict = errors.New("conflict")
	// ErrBadRequest indicates invalid input.
	ErrBadRequest = errors.New("bad request")
)
