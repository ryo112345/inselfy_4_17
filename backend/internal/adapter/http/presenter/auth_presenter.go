package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type AuthPresenter struct {
	tokenResponse *AuthTokenResponse
	userResponse  *AuthUserResponse
}

type AuthTokenResponse struct {
	AccessToken  string
	RefreshToken string
	User         *AuthUserResponse
}

type AuthUserResponse struct {
	ID          string    `json:"id"`
	Username    string    `json:"username"`
	Name        string    `json:"name"`
	DisplayName *string   `json:"displayName,omitempty"`
	AvatarURL   *string   `json:"avatarUrl,omitempty"`
	Email       *string   `json:"email,omitempty"`
	NeedsSetup  bool      `json:"needsSetup"`
	CreatedAt   time.Time `json:"createdAt"`
}

var _ port.AuthOutputPort = (*AuthPresenter)(nil)

func NewAuthPresenter() *AuthPresenter {
	return &AuthPresenter{}
}

func (p *AuthPresenter) PresentTokenPair(_ context.Context, pair *auth.TokenPair, u *user.User) error {
	p.tokenResponse = &AuthTokenResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		User:         toAuthUserResponse(u),
	}
	return nil
}

func (p *AuthPresenter) PresentUser(_ context.Context, u *user.User) error {
	p.userResponse = toAuthUserResponse(u)
	return nil
}

func (p *AuthPresenter) TokenResponse() *AuthTokenResponse {
	return p.tokenResponse
}

func (p *AuthPresenter) UserResponse() *AuthUserResponse {
	return p.userResponse
}

func toAuthUserResponse(u *user.User) *AuthUserResponse {
	username := u.Username.String()
	needsSetup := len(username) == 13 && username[:5] == "user_"
	return &AuthUserResponse{
		ID:          u.ID,
		Username:    username,
		Name:        u.Name,
		DisplayName: u.DisplayName,
		AvatarURL:   u.AvatarURL,
		Email:       u.Email,
		NeedsSetup:  needsSetup,
		CreatedAt:   u.CreatedAt,
	}
}
