// Package user holds user domain models.
package user

import "time"

// User is the aggregate root representing a registered user.
type User struct {
	ID        string
	Username  Username
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// CreateUserInput is the input for creating a new user.
type CreateUserInput struct {
	Name     string
	Username string
}
