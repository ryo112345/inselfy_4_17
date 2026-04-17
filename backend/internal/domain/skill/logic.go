package skill

import (
	"errors"
	"strings"
)

const (
	MaxPerUser    = 50
	MaxNameLength = 100
)

var (
	ErrNameRequired   = errors.New("skill name is required")
	ErrNameTooLong    = errors.New("skill name must be 100 characters or fewer")
	ErrTooManyEntries = errors.New("skills are limited to 50 per user")
)

// NormalizeName trims surrounding whitespace. A nil result means the name is empty.
func NormalizeName(raw string) string {
	return strings.TrimSpace(raw)
}

// ValidateName validates a skill name after normalization.
func ValidateName(raw string) (string, error) {
	name := NormalizeName(raw)
	if name == "" {
		return "", ErrNameRequired
	}
	if len([]rune(name)) > MaxNameLength {
		return "", ErrNameTooLong
	}
	return name, nil
}
