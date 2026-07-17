package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
)

type AuthInputPort interface {
	GoogleLogin(ctx context.Context, idToken string) (*auth.TokenPair, *user.User, error)
	RefreshToken(ctx context.Context, refreshToken string) (*auth.TokenPair, *user.User, error)
	GetCurrentUser(ctx context.Context, userID string) (*user.User, error)
}

type RefreshTokenRepository interface {
	Create(ctx context.Context, rt *auth.RefreshToken) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*auth.RefreshToken, error)
	RevokeByID(ctx context.Context, id string) error
}

type GoogleTokenVerifier interface {
	Verify(ctx context.Context, idToken string, clientID string) (*auth.GoogleClaims, error)
}

type JWTService interface {
	GenerateAccessToken(userID string) (string, error)
	GenerateCompanyAccessToken(companyID string) (string, error)
	GenerateRefreshToken() (string, error)
	ValidateAccessToken(tokenString string) (userID string, err error)
	ValidateCompanyAccessToken(tokenString string) (companyID string, err error)
	HashRefreshToken(token string) string
}
