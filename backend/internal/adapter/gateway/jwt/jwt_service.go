package jwt

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"

	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/port"
)

const (
	issuer   = "inselfy"
	audience = "inselfy"
)

type Service struct {
	secret []byte
}

var _ port.JWTService = (*Service)(nil)

func NewService(secret string) *Service {
	return &Service{secret: []byte(secret)}
}

func (s *Service) GenerateAccessToken(userID string) (string, error) {
	claims := jwtlib.RegisteredClaims{
		Subject:   userID,
		Issuer:    issuer,
		Audience:  jwtlib.ClaimStrings{audience},
		ExpiresAt: jwtlib.NewNumericDate(time.Now().Add(15 * time.Minute)),
		IssuedAt:  jwtlib.NewNumericDate(time.Now()),
	}
	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

func (s *Service) GenerateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate refresh token: %w", err)
	}
	return hex.EncodeToString(b), nil
}

func (s *Service) ValidateAccessToken(tokenString string) (string, error) {
	token, err := jwtlib.ParseWithClaims(tokenString, &jwtlib.RegisteredClaims{}, func(t *jwtlib.Token) (any, error) {
		if _, ok := t.Method.(*jwtlib.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.secret, nil
	},
		jwtlib.WithIssuer(issuer),
		jwtlib.WithAudience(audience),
		jwtlib.WithExpirationRequired(),
	)
	if err != nil {
		return "", auth.ErrUnauthorized
	}
	subject, err := token.Claims.GetSubject()
	if err != nil || subject == "" {
		return "", auth.ErrUnauthorized
	}
	return subject, nil
}

func (s *Service) HashRefreshToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
