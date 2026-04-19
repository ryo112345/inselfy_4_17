package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type AuthInteractor struct {
	userRepo       port.UserRepository
	refreshRepo    port.RefreshTokenRepository
	googleVerifier port.GoogleTokenVerifier
	jwtService     port.JWTService
	output         port.AuthOutputPort
	googleClientID string
}

var _ port.AuthInputPort = (*AuthInteractor)(nil)

func NewAuthInteractor(
	userRepo port.UserRepository,
	refreshRepo port.RefreshTokenRepository,
	googleVerifier port.GoogleTokenVerifier,
	jwtService port.JWTService,
	output port.AuthOutputPort,
	googleClientID string,
) *AuthInteractor {
	return &AuthInteractor{
		userRepo:       userRepo,
		refreshRepo:    refreshRepo,
		googleVerifier: googleVerifier,
		jwtService:     jwtService,
		output:         output,
		googleClientID: googleClientID,
	}
}

func (a *AuthInteractor) GoogleLogin(ctx context.Context, idToken string) error {
	claims, err := a.googleVerifier.Verify(ctx, idToken, a.googleClientID)
	if err != nil {
		return auth.ErrInvalidGoogleToken
	}

	u, err := a.userRepo.GetByOAuthProvider(ctx, "google", claims.Sub)
	if err != nil && !errors.Is(err, domainerr.ErrNotFound) {
		return err
	}

	if u == nil {
		username := fmt.Sprintf("user_%s", uuid.New().String()[:8])
		name := claims.Name
		if name == "" {
			name = "User"
		}
		email := claims.Email
		provider := "google"
		providerID := claims.Sub
		picture := claims.Picture

		u = &user.User{
			Username:        user.Username(username),
			Name:            name,
			Email:           &email,
			OAuthProvider:   &provider,
			OAuthProviderID: &providerID,
			AvatarURL:       &picture,
		}
		u, err = a.userRepo.Create(ctx, u)
		if err != nil {
			return err
		}
	}

	return a.issueTokenPair(ctx, u)
}

func (a *AuthInteractor) RefreshToken(ctx context.Context, refreshToken string) error {
	hash := a.jwtService.HashRefreshToken(refreshToken)
	rt, err := a.refreshRepo.GetByTokenHash(ctx, hash)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return auth.ErrRefreshTokenRevoked
		}
		return err
	}

	if err := a.refreshRepo.RevokeByUserID(ctx, rt.UserID); err != nil {
		return err
	}

	u, err := a.userRepo.GetByID(ctx, rt.UserID)
	if err != nil {
		return err
	}

	return a.issueTokenPair(ctx, u)
}

func (a *AuthInteractor) GetCurrentUser(ctx context.Context, userID string) error {
	u, err := a.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	return a.output.PresentUser(ctx, u)
}

func (a *AuthInteractor) issueTokenPair(ctx context.Context, u *user.User) error {
	accessToken, err := a.jwtService.GenerateAccessToken(u.ID)
	if err != nil {
		return err
	}

	rawRefresh, err := a.jwtService.GenerateRefreshToken()
	if err != nil {
		return err
	}

	rt := &auth.RefreshToken{
		UserID:    u.ID,
		TokenHash: a.jwtService.HashRefreshToken(rawRefresh),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := a.refreshRepo.Create(ctx, rt); err != nil {
		return err
	}

	pair := &auth.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
	}
	return a.output.PresentTokenPair(ctx, pair, u)
}
