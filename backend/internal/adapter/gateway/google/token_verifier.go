package google

import (
	"context"
	"strings"

	"google.golang.org/api/idtoken"

	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type TokenVerifier struct{}

var _ port.GoogleTokenVerifier = (*TokenVerifier)(nil)

func NewTokenVerifier() *TokenVerifier {
	return &TokenVerifier{}
}

func (v *TokenVerifier) Verify(ctx context.Context, idToken string, clientID string) (*auth.GoogleClaims, error) {
	payload, err := idtoken.Validate(ctx, idToken, clientID)
	if err != nil {
		return nil, auth.ErrInvalidGoogleToken
	}

	claims := &auth.GoogleClaims{
		Sub: payload.Subject,
	}
	if email, ok := payload.Claims["email"].(string); ok {
		claims.Email = email
	}
	if name, ok := payload.Claims["name"].(string); ok {
		claims.Name = name
	}
	if picture, ok := payload.Claims["picture"].(string); ok {
		claims.Picture = strings.Replace(picture, "=s96-c", "=s400-c", 1)
	}
	return claims, nil
}
