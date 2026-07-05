package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
)

type AuthTokenResponse struct {
	AccessToken  string
	RefreshToken string
	User         *openapi.ModelsAuthUserResponse
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

func toAuthUserResponse(u *user.User) *openapi.ModelsAuthUserResponse {
	username := u.Username.String()
	needsSetup := len(username) == 13 && username[:5] == "user_"
	return &openapi.ModelsAuthUserResponse{
		Id:         u.ID,
		Username:   username,
		Name:       u.Name,
		AvatarUrl:  u.AvatarURL,
		Email:      u.Email,
		NeedsSetup: needsSetup,
		CreatedAt:  u.CreatedAt,
	}
}
