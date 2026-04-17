package user

import (
	"errors"
	"strings"
)

// MaxNameLength is the maximum allowed length of a display name.
const MaxNameLength = 100

var (
	// ErrInvalidUsername indicates the username format is invalid.
	ErrInvalidUsername = errors.New("username must be 3-20 characters of a-z, A-Z, 0-9, or _")
	// ErrNameRequired indicates the name field is empty.
	ErrNameRequired = errors.New("name is required")
	// ErrNameTooLong indicates the name exceeds the allowed length.
	ErrNameTooLong = errors.New("name must be 100 characters or fewer")
)

// ValidateName checks name rules.
func ValidateName(name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return ErrNameRequired
	}
	if len([]rune(trimmed)) > MaxNameLength {
		return ErrNameTooLong
	}
	return nil
}

// Validate checks business rules for a user entity.
func Validate(u User) error {
	if err := ValidateName(u.Name); err != nil {
		return err
	}
	if u.Username == "" {
		return ErrInvalidUsername
	}
	return nil
}
