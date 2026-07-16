// Package port defines application ports (interfaces).
package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/user"
)

// UserInputPort defines user use case input methods.
type UserInputPort interface {
	Create(ctx context.Context, input user.CreateUserInput) (*user.User, error)
	GetByUsername(ctx context.Context, username string) (*user.User, error)
	GetByID(ctx context.Context, id string) (*user.User, error)
	UpdateProfile(ctx context.Context, authUserID, username string, input user.UpdateProfileInput) (*user.User, error)
}

// UserRepository abstracts user persistence.
type UserRepository interface {
	Create(ctx context.Context, u *user.User) (*user.User, error)
	GetByUsername(ctx context.Context, username user.Username) (*user.User, error)
	GetByID(ctx context.Context, id string) (*user.User, error)
	GetByOAuthProvider(ctx context.Context, provider, providerID string) (*user.User, error)
	UpdateProfile(ctx context.Context, id string, input user.UpdateProfileInput) (*user.User, error)
}
