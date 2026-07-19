package usecase_test

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"testing"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

type jwtServiceStub struct {
	refreshCounter int
}

func (s *jwtServiceStub) GenerateAccessToken(userID string) (string, error) {
	return "access-" + userID, nil
}

func (s *jwtServiceStub) GenerateCompanyAccessToken(companyID string) (string, error) {
	return "access-" + companyID, nil
}

func (s *jwtServiceStub) GenerateRefreshToken() (string, error) {
	s.refreshCounter++
	return fmt.Sprintf("refresh-%d", s.refreshCounter), nil
}

func (s *jwtServiceStub) ValidateAccessToken(string) (string, error) { return "", nil }

func (s *jwtServiceStub) ValidateCompanyAccessToken(string) (string, error) { return "", nil }

func (s *jwtServiceStub) HashRefreshToken(token string) string { return "hash:" + token }

// refreshRepoStub は gateway 実装と同じ規約で振る舞う in-memory リポジトリ。
// GetByTokenHash は revoked/expired を ErrNotFound として弾く。
type refreshRepoStub struct {
	tokens []*auth.RefreshToken
	nextID int
}

func (s *refreshRepoStub) seed(userID, rawToken string, jwt *jwtServiceStub) {
	s.nextID++
	s.tokens = append(s.tokens, &auth.RefreshToken{
		ID:        strconv.Itoa(s.nextID),
		UserID:    userID,
		TokenHash: jwt.HashRefreshToken(rawToken),
		ExpiresAt: time.Now().Add(time.Hour),
	})
}

func (s *refreshRepoStub) Create(_ context.Context, rt *auth.RefreshToken) error {
	s.nextID++
	stored := *rt
	stored.ID = strconv.Itoa(s.nextID)
	s.tokens = append(s.tokens, &stored)
	return nil
}

func (s *refreshRepoStub) GetByTokenHash(_ context.Context, tokenHash string) (*auth.RefreshToken, error) {
	for _, rt := range s.tokens {
		if rt.TokenHash == tokenHash && rt.RevokedAt == nil && rt.ExpiresAt.After(time.Now()) {
			return rt, nil
		}
	}
	return nil, domainerr.ErrNotFound
}

func (s *refreshRepoStub) RevokeByID(_ context.Context, id string) error {
	for _, rt := range s.tokens {
		if rt.ID == id && rt.RevokedAt == nil {
			now := time.Now()
			rt.RevokedAt = &now
		}
	}
	return nil
}

// per-token rotation: 片方の端末が refresh しても、もう片方の refresh_token は生き残る
func TestAuthRefreshToken_PerTokenRotation(t *testing.T) {
	jwt := &jwtServiceStub{}
	refreshRepo := &refreshRepoStub{}
	refreshRepo.seed("u1", "device-a-token", jwt)
	refreshRepo.seed("u1", "device-b-token", jwt)

	userRepo := &userRepoStub{
		getByIDFn: func(_ context.Context, id string) (*user.User, error) {
			return &user.User{ID: id, Username: user.Username("alice"), Name: "Alice"}, nil
		},
	}
	interactor := usecase.NewAuthInteractor(userRepo, refreshRepo, nil, jwt, "client-id")
	ctx := context.Background()

	pair, u, err := interactor.RefreshToken(ctx, "device-a-token")
	if err != nil {
		t.Fatalf("refresh with device A failed: %v", err)
	}
	if u.ID != "u1" {
		t.Errorf("user ID = %q, want u1", u.ID)
	}
	if pair.RefreshToken != "refresh-1" {
		t.Errorf("new refresh token = %q, want refresh-1", pair.RefreshToken)
	}

	// 使った device A のトークンは失効し、再利用は 401 相当のエラーになる
	if _, _, err := interactor.RefreshToken(ctx, "device-a-token"); !errors.Is(err, auth.ErrRefreshTokenRevoked) {
		t.Errorf("reuse of rotated token: err = %v, want ErrRefreshTokenRevoked", err)
	}

	// device B のトークンは生きていて refresh できる
	if _, _, err := interactor.RefreshToken(ctx, "device-b-token"); err != nil {
		t.Errorf("refresh with device B failed: %v", err)
	}
}
