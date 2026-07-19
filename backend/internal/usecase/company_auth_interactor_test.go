package usecase_test

import (
	"context"
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

type companyAccountRepoStub struct {
	getByIDFn func(ctx context.Context, id string) (*company.CompanyAccount, error)
}

func (s *companyAccountRepoStub) Create(_ context.Context, c *company.CompanyAccount) (*company.CompanyAccount, error) {
	return c, nil
}

func (s *companyAccountRepoStub) GetByEmail(_ context.Context, _ string) (*company.CompanyAccount, error) {
	return nil, domainerr.ErrNotFound
}

func (s *companyAccountRepoStub) GetByID(ctx context.Context, id string) (*company.CompanyAccount, error) {
	return s.getByIDFn(ctx, id)
}

func (s *companyAccountRepoStub) UpdateStatus(_ context.Context, _ string, _ company.Status) (*company.CompanyAccount, error) {
	return nil, domainerr.ErrNotFound
}

type companyRefreshRepoStub struct {
	tokens []*company.CompanyRefreshToken
	nextID int
}

func (s *companyRefreshRepoStub) seed(companyID, rawToken string, jwt *jwtServiceStub) {
	s.nextID++
	s.tokens = append(s.tokens, &company.CompanyRefreshToken{
		ID:        strconv.Itoa(s.nextID),
		CompanyID: companyID,
		TokenHash: jwt.HashRefreshToken(rawToken),
		ExpiresAt: time.Now().Add(time.Hour),
	})
}

func (s *companyRefreshRepoStub) Create(_ context.Context, rt *company.CompanyRefreshToken) error {
	s.nextID++
	stored := *rt
	stored.ID = strconv.Itoa(s.nextID)
	s.tokens = append(s.tokens, &stored)
	return nil
}

func (s *companyRefreshRepoStub) GetByTokenHash(_ context.Context, tokenHash string) (*company.CompanyRefreshToken, error) {
	for _, rt := range s.tokens {
		if rt.TokenHash == tokenHash && rt.RevokedAt == nil && rt.ExpiresAt.After(time.Now()) {
			return rt, nil
		}
	}
	return nil, domainerr.ErrNotFound
}

func (s *companyRefreshRepoStub) RevokeByID(_ context.Context, id string) error {
	for _, rt := range s.tokens {
		if rt.ID == id && rt.RevokedAt == nil {
			now := time.Now()
			rt.RevokedAt = &now
		}
	}
	return nil
}

// per-token rotation: 担当者Aの refresh が他の担当者のセッションを飛ばさない
func TestCompanyAuthRefreshToken_PerTokenRotation(t *testing.T) {
	jwt := &jwtServiceStub{}
	refreshRepo := &companyRefreshRepoStub{}
	refreshRepo.seed("c1", "staff-a-token", jwt)
	refreshRepo.seed("c1", "staff-b-token", jwt)

	companyRepo := &companyAccountRepoStub{
		getByIDFn: func(_ context.Context, id string) (*company.CompanyAccount, error) {
			return &company.CompanyAccount{ID: id, Status: company.StatusApproved}, nil
		},
	}
	interactor := usecase.NewCompanyAuthInteractor(companyRepo, refreshRepo, jwt, nil)
	ctx := context.Background()

	pair, account, err := interactor.RefreshToken(ctx, "staff-a-token")
	if err != nil {
		t.Fatalf("refresh with staff A failed: %v", err)
	}
	if account.ID != "c1" {
		t.Errorf("company ID = %q, want c1", account.ID)
	}
	if pair.RefreshToken != "refresh-1" {
		t.Errorf("new refresh token = %q, want refresh-1", pair.RefreshToken)
	}

	// 使った staff A のトークンは失効し、再利用は 401 相当のエラーになる
	if _, _, err := interactor.RefreshToken(ctx, "staff-a-token"); !errors.Is(err, auth.ErrRefreshTokenRevoked) {
		t.Errorf("reuse of rotated token: err = %v, want ErrRefreshTokenRevoked", err)
	}

	// staff B のトークンは生きていて refresh できる
	if _, _, err := interactor.RefreshToken(ctx, "staff-b-token"); err != nil {
		t.Errorf("refresh with staff B failed: %v", err)
	}
}
