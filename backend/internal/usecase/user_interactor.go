// Package usecase contains application use case implementations.
package usecase

import (
	"context"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// UserInteractor handles user use cases.
type UserInteractor struct {
	repo port.UserRepository
}

var _ port.UserInputPort = (*UserInteractor)(nil)

// NewUserInteractor creates a UserInteractor.
func NewUserInteractor(repo port.UserRepository) *UserInteractor {
	return &UserInteractor{repo: repo}
}

// Create creates a new user from the given input.
func (u *UserInteractor) Create(ctx context.Context, input user.CreateUserInput) (*user.User, error) {
	username, err := user.ParseUsername(input.Username)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(input.Name)
	if err := user.ValidateName(name); err != nil {
		return nil, err
	}
	entity := &user.User{
		Username: username,
		Name:     name,
	}
	return u.repo.Create(ctx, entity)
}

// GetByUsername fetches a user by username.
func (u *UserInteractor) GetByUsername(ctx context.Context, raw string) (*user.User, error) {
	username, err := user.ParseUsername(raw)
	if err != nil {
		return nil, err
	}
	return u.repo.GetByUsername(ctx, username)
}

// GetByID fetches a user by ID.
func (u *UserInteractor) GetByID(ctx context.Context, id string) (*user.User, error) {
	return u.repo.GetByID(ctx, id)
}

// UpdateProfile patches a user's profile. The update is scoped to a single row
// so no transaction boundary is required.
func (u *UserInteractor) UpdateProfile(ctx context.Context, rawUsername string, input user.UpdateProfileInput) (*user.User, error) {
	username, err := user.ParseUsername(rawUsername)
	if err != nil {
		return nil, err
	}
	if input.Username != nil {
		trimmed := strings.TrimSpace(*input.Username)
		if _, err := user.ParseUsername(trimmed); err != nil {
			return nil, err
		}
		input.Username = &trimmed
	}
	if input.Name != nil {
		trimmed := strings.TrimSpace(*input.Name)
		input.Name = &trimmed
	}
	if err := user.ValidateUpdateProfile(input); err != nil {
		return nil, err
	}
	existing, err := u.repo.GetByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	return u.repo.UpdateProfile(ctx, existing.ID, input)
}
