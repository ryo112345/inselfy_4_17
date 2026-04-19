// Package user holds user domain models.
package user

import "time"

// User is the aggregate root representing a registered user's profile.
// Optional profile fields use pointers so a nil value denotes "not set"
// and is distinguishable from an explicit empty string at the application
// layer.
type User struct {
	ID               string
	Username         Username
	Name             string
	DisplayName      *string
	Headline         *string
	Location         *string
	About            *string
	Industry         *string
	JobType          *string
	JobSeekingStatus *string
	ProfileColor     *string
	IsPublic         bool
	Email            *string
	OAuthProvider    *string
	OAuthProviderID  *string
	AvatarURL        *string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// CreateUserInput is the input for creating a new user.
type CreateUserInput struct {
	Name     string
	Username string
}

// UpdateProfileInput describes partial updates to a user's profile.
// A nil pointer means "do not touch this field"; a non-nil pointer to
// a pointer means "set to that value (possibly nil to clear)".
type UpdateProfileInput struct {
	Username         *string
	Name             *string
	DisplayName      **string
	Headline         **string
	Location         **string
	About            **string
	Industry         **string
	JobType          **string
	JobSeekingStatus **string
	ProfileColor     **string
	IsPublic         *bool
}
