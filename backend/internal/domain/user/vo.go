package user

import (
	"regexp"
	"strings"
)

// Username is a value object representing a user's handle.
type Username string

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,20}$`)

// ParseUsername trims an optional leading "@" and validates the format.
func ParseUsername(raw string) (Username, error) {
	u := strings.TrimSpace(raw)
	u = strings.TrimPrefix(u, "@")
	if !usernameRegex.MatchString(u) {
		return "", ErrInvalidUsername
	}
	return Username(u), nil
}

// String returns the username as a plain string (without leading @).
func (u Username) String() string {
	return string(u)
}
