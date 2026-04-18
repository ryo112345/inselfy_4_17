// Package errors defines domain-level error values.
package errors

import (
	"errors"
	"fmt"
)

var (
	// ErrNotFound indicates resource not found.
	ErrNotFound = errors.New("not found")
	// ErrConflict indicates a uniqueness or state conflict.
	ErrConflict = errors.New("conflict")
	// ErrBadRequest indicates invalid input.
	ErrBadRequest = errors.New("bad request")
)

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string { return e.Message }

func (e *ValidationError) Unwrap() error { return ErrBadRequest }

func NewValidation(msg string, args ...any) error {
	if len(args) > 0 {
		msg = fmt.Sprintf(msg, args...)
	}
	return &ValidationError{Message: msg}
}
