package presenter

import (
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
)

type AuthTokenResponse struct {
	AccessToken  string
	RefreshToken string
	User         *AuthUserResponse
}

type AuthUserResponse struct {
	ID         string    `json:"id"`
	Username   string    `json:"username"`
	Name       string    `json:"name"`
	AvatarURL  *string   `json:"avatarUrl,omitempty"`
	Email      *string   `json:"email,omitempty"`
	NeedsSetup bool      `json:"needsSetup"`
	CreatedAt  time.Time `json:"createdAt"`
}

// AuthTokenPairResponse builds the token-pair API response (with embedded user).
func AuthTokenPairResponse(pair *auth.TokenPair, u *user.User) any {
	return &AuthTokenResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		User:         toAuthUserResponse(u),
	}
}

// AuthMeResponse builds the current-user API response.
func AuthMeResponse(u *user.User) any {
	return toAuthUserResponse(u)
}

func toAuthUserResponse(u *user.User) *AuthUserResponse {
	username := u.Username.String()
	needsSetup := len(username) == 13 && username[:5] == "user_"
	return &AuthUserResponse{
		ID:         u.ID,
		Username:   username,
		Name:       u.Name,
		AvatarURL:  u.AvatarURL,
		Email:      u.Email,
		NeedsSetup: needsSetup,
		CreatedAt:  u.CreatedAt,
	}
}
