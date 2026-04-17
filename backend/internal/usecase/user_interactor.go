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
	repo   port.UserRepository
	output port.UserOutputPort
}

var _ port.UserInputPort = (*UserInteractor)(nil)

// NewUserInteractor creates a UserInteractor.
func NewUserInteractor(repo port.UserRepository, output port.UserOutputPort) *UserInteractor {
	return &UserInteractor{repo: repo, output: output}
}

// Create creates a new user from the given input.
func (u *UserInteractor) Create(ctx context.Context, input user.CreateUserInput) error {
	username, err := user.ParseUsername(input.Username)
	if err != nil {
		return err
	}
	name := strings.TrimSpace(input.Name)
	if err := user.ValidateName(name); err != nil {
		return err
	}
	entity := &user.User{
		Username: username,
		Name:     name,
	}
	created, err := u.repo.Create(ctx, entity)
	if err != nil {
		return err
	}
	return u.output.PresentUser(ctx, created)
}

// GetByUsername fetches a user by username.
func (u *UserInteractor) GetByUsername(ctx context.Context, raw string) error {
	username, err := user.ParseUsername(raw)
	if err != nil {
		return err
	}
	usr, err := u.repo.GetByUsername(ctx, username)
	if err != nil {
		return err
	}
	return u.output.PresentUser(ctx, usr)
}
