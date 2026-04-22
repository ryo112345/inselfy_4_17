package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyAccountRepository struct {
	queries *generated.Queries
}

var _ port.CompanyAccountRepository = (*CompanyAccountRepository)(nil)

func NewCompanyAccountRepository(pool *pgxpool.Pool) *CompanyAccountRepository {
	return &CompanyAccountRepository{queries: generated.New(pool)}
}

func (r *CompanyAccountRepository) Create(ctx context.Context, c *company.CompanyAccount) (*company.CompanyAccount, error) {
	q := queriesForContext(ctx, r.queries)
	row, err := q.CreateCompanyAccount(ctx, &generated.CreateCompanyAccountParams{
		Email:             c.Email,
		PasswordHash:      c.PasswordHash,
		CompanyName:       c.CompanyName,
		ContactPersonName: c.ContactPersonName,
		PhoneNumber:       c.PhoneNumber,
	})
	if err != nil {
		if isUniqueViolation(err) {
			return nil, company.ErrEmailAlreadyRegistered
		}
		return nil, err
	}
	return toDomainCompany(row), nil
}

func (r *CompanyAccountRepository) GetByEmail(ctx context.Context, email string) (*company.CompanyAccount, error) {
	q := queriesForContext(ctx, r.queries)
	row, err := q.GetCompanyAccountByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainCompany(row), nil
}

func (r *CompanyAccountRepository) GetByID(ctx context.Context, id string) (*company.CompanyAccount, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetCompanyAccountByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainCompany(row), nil
}

func (r *CompanyAccountRepository) UpdateStatus(ctx context.Context, id string, status company.Status) (*company.CompanyAccount, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.UpdateCompanyStatus(ctx, &generated.UpdateCompanyStatusParams{
		ID:     pgID,
		Status: generated.CompanyStatus(status),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainCompany(row), nil
}

func toDomainCompany(row *generated.CompanyAccount) *company.CompanyAccount {
	return &company.CompanyAccount{
		ID:                uuidToString(row.ID),
		Email:             row.Email,
		PasswordHash:      row.PasswordHash,
		CompanyName:       row.CompanyName,
		ContactPersonName: row.ContactPersonName,
		PhoneNumber:       row.PhoneNumber,
		Status:            company.Status(row.Status),
		CreatedAt:         row.CreatedAt.Time,
		UpdatedAt:         row.UpdatedAt.Time,
	}
}
