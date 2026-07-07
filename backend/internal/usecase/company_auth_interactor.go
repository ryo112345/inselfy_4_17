package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyAuthInteractor struct {
	companyRepo port.CompanyAccountRepository
	refreshRepo port.CompanyRefreshTokenRepository
	jwtService  port.JWTService
	hasher      port.PasswordHasher
}

var _ port.CompanyAuthInputPort = (*CompanyAuthInteractor)(nil)

func NewCompanyAuthInteractor(
	companyRepo port.CompanyAccountRepository,
	refreshRepo port.CompanyRefreshTokenRepository,
	jwtService port.JWTService,
	hasher port.PasswordHasher,
) *CompanyAuthInteractor {
	return &CompanyAuthInteractor{
		companyRepo: companyRepo,
		refreshRepo: refreshRepo,
		jwtService:  jwtService,
		hasher:      hasher,
	}
}

func (i *CompanyAuthInteractor) Register(ctx context.Context, input company.RegisterInput) (*company.CompanyAccount, error) {
	normalizeStrings(&input.Email, &input.CompanyName, &input.ContactPersonName, &input.PhoneNumber)

	if err := company.ValidateRegistration(input); err != nil {
		return nil, err
	}

	hash, err := i.hasher.Hash(input.Password)
	if err != nil {
		return nil, err
	}

	account := &company.CompanyAccount{
		Email:             input.Email,
		PasswordHash:      hash,
		CompanyName:       input.CompanyName,
		ContactPersonName: input.ContactPersonName,
		PhoneNumber:       input.PhoneNumber,
		Status:            company.StatusPending,
	}

	created, err := i.companyRepo.Create(ctx, account)
	if err != nil {
		return nil, err
	}

	return created, nil
}

func (i *CompanyAuthInteractor) Login(ctx context.Context, email, password string) (*auth.TokenPair, *company.CompanyAccount, error) {
	account, err := i.companyRepo.GetByEmail(ctx, strings.TrimSpace(email))
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return nil, nil, company.ErrInvalidCredentials
		}
		return nil, nil, err
	}

	if err := i.hasher.Compare(account.PasswordHash, password); err != nil {
		return nil, nil, company.ErrInvalidCredentials
	}

	switch account.Status {
	case company.StatusPending:
		return nil, nil, company.ErrAccountPending
	case company.StatusRejected:
		return nil, nil, company.ErrAccountRejected
	}

	return i.issueTokenPair(ctx, account)
}

func (i *CompanyAuthInteractor) RefreshToken(ctx context.Context, refreshToken string) (*auth.TokenPair, *company.CompanyAccount, error) {
	hash := i.jwtService.HashRefreshToken(refreshToken)
	rt, err := i.refreshRepo.GetByTokenHash(ctx, hash)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return nil, nil, auth.ErrRefreshTokenRevoked
		}
		return nil, nil, err
	}

	if err := i.refreshRepo.RevokeByCompanyID(ctx, rt.CompanyID); err != nil {
		return nil, nil, err
	}

	account, err := i.companyRepo.GetByID(ctx, rt.CompanyID)
	if err != nil {
		return nil, nil, err
	}

	return i.issueTokenPair(ctx, account)
}

func (i *CompanyAuthInteractor) GetCurrentCompany(ctx context.Context, companyID string) (*company.CompanyAccount, error) {
	account, err := i.companyRepo.GetByID(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return account, nil
}

func (i *CompanyAuthInteractor) issueTokenPair(ctx context.Context, account *company.CompanyAccount) (*auth.TokenPair, *company.CompanyAccount, error) {
	accessToken, err := i.jwtService.GenerateCompanyAccessToken(account.ID)
	if err != nil {
		return nil, nil, err
	}

	rawRefresh, err := i.jwtService.GenerateRefreshToken()
	if err != nil {
		return nil, nil, err
	}

	rt := &company.CompanyRefreshToken{
		CompanyID: account.ID,
		TokenHash: i.jwtService.HashRefreshToken(rawRefresh),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := i.refreshRepo.Create(ctx, rt); err != nil {
		return nil, nil, err
	}

	pair := &auth.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
	}
	return pair, account, nil
}
