package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
)

type CompanyAuthInputPort interface {
	Register(ctx context.Context, input company.RegisterInput) (*company.CompanyAccount, error)
	Login(ctx context.Context, email, password string) (*auth.TokenPair, *company.CompanyAccount, error)
	RefreshToken(ctx context.Context, refreshToken string) (*auth.TokenPair, *company.CompanyAccount, error)
	GetCurrentCompany(ctx context.Context, companyID string) (*company.CompanyAccount, error)
}

type CompanyAccountRepository interface {
	Create(ctx context.Context, c *company.CompanyAccount) (*company.CompanyAccount, error)
	GetByEmail(ctx context.Context, email string) (*company.CompanyAccount, error)
	GetByID(ctx context.Context, id string) (*company.CompanyAccount, error)
	UpdateStatus(ctx context.Context, id string, status company.Status) (*company.CompanyAccount, error)
}

type CompanyRefreshTokenRepository interface {
	Create(ctx context.Context, rt *company.CompanyRefreshToken) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*company.CompanyRefreshToken, error)
	RevokeByCompanyID(ctx context.Context, companyID string) error
}

type PasswordHasher interface {
	Hash(password string) (string, error)
	Compare(hash, password string) error
}
