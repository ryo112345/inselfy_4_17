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
	output      port.CompanyAuthOutputPort
}

var _ port.CompanyAuthInputPort = (*CompanyAuthInteractor)(nil)

func NewCompanyAuthInteractor(
	companyRepo port.CompanyAccountRepository,
	refreshRepo port.CompanyRefreshTokenRepository,
	jwtService port.JWTService,
	hasher port.PasswordHasher,
	output port.CompanyAuthOutputPort,
) *CompanyAuthInteractor {
	return &CompanyAuthInteractor{
		companyRepo: companyRepo,
		refreshRepo: refreshRepo,
		jwtService:  jwtService,
		hasher:      hasher,
		output:      output,
	}
}

func (i *CompanyAuthInteractor) Register(ctx context.Context, input company.RegisterInput) error {
	input.Email = strings.TrimSpace(input.Email)
	input.CompanyName = strings.TrimSpace(input.CompanyName)
	input.ContactPersonName = strings.TrimSpace(input.ContactPersonName)
	input.PhoneNumber = strings.TrimSpace(input.PhoneNumber)

	if err := company.ValidateRegistration(input); err != nil {
		return err
	}

	hash, err := i.hasher.Hash(input.Password)
	if err != nil {
		return err
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
		return err
	}

	return i.output.PresentRegistered(ctx, created)
}

func (i *CompanyAuthInteractor) Login(ctx context.Context, email, password string) error {
	account, err := i.companyRepo.GetByEmail(ctx, strings.TrimSpace(email))
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return company.ErrInvalidCredentials
		}
		return err
	}

	if err := i.hasher.Compare(account.PasswordHash, password); err != nil {
		return company.ErrInvalidCredentials
	}

	switch account.Status {
	case company.StatusPending:
		return company.ErrAccountPending
	case company.StatusRejected:
		return company.ErrAccountRejected
	}

	return i.issueTokenPair(ctx, account)
}

func (i *CompanyAuthInteractor) RefreshToken(ctx context.Context, refreshToken string) error {
	hash := i.jwtService.HashRefreshToken(refreshToken)
	rt, err := i.refreshRepo.GetByTokenHash(ctx, hash)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return auth.ErrRefreshTokenRevoked
		}
		return err
	}

	if err := i.refreshRepo.RevokeByCompanyID(ctx, rt.CompanyID); err != nil {
		return err
	}

	account, err := i.companyRepo.GetByID(ctx, rt.CompanyID)
	if err != nil {
		return err
	}

	return i.issueTokenPair(ctx, account)
}

func (i *CompanyAuthInteractor) GetCurrentCompany(ctx context.Context, companyID string) error {
	account, err := i.companyRepo.GetByID(ctx, companyID)
	if err != nil {
		return err
	}
	return i.output.PresentCompany(ctx, account)
}

func (i *CompanyAuthInteractor) issueTokenPair(ctx context.Context, account *company.CompanyAccount) error {
	accessToken, err := i.jwtService.GenerateCompanyAccessToken(account.ID)
	if err != nil {
		return err
	}

	rawRefresh, err := i.jwtService.GenerateRefreshToken()
	if err != nil {
		return err
	}

	rt := &company.CompanyRefreshToken{
		CompanyID: account.ID,
		TokenHash: i.jwtService.HashRefreshToken(rawRefresh),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := i.refreshRepo.Create(ctx, rt); err != nil {
		return err
	}

	pair := &auth.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
	}
	return i.output.PresentTokenPair(ctx, pair, account)
}
