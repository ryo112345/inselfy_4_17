package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// --- ScoutCreditRepository ---

type ScoutCreditRepository struct {
	queries *generated.Queries
}

var _ port.ScoutCreditRepository = (*ScoutCreditRepository)(nil)

func NewScoutCreditRepository(pool *pgxpool.Pool) *ScoutCreditRepository {
	return &ScoutCreditRepository{queries: generated.New(pool)}
}

func (r *ScoutCreditRepository) GetOrCreate(ctx context.Context, companyID string) (*scout.ScoutCredit, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetOrCreateScoutCredit(ctx, pgCompanyID)
	if err != nil {
		return nil, err
	}
	return scoutCreditToDomain(row), nil
}

func (r *ScoutCreditRepository) Deduct(ctx context.Context, companyID string) (*scout.ScoutCredit, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.DeductScoutCredit(ctx, pgCompanyID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return scoutCreditToDomain(row), nil
}

func (r *ScoutCreditRepository) Refund(ctx context.Context, companyID string) (*scout.ScoutCredit, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.RefundScoutCredit(ctx, pgCompanyID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return scoutCreditToDomain(row), nil
}

func scoutCreditToDomain(row *generated.ScoutCredit) *scout.ScoutCredit {
	return &scout.ScoutCredit{
		ID:                uuidToString(row.ID),
		CompanyID:         uuidToString(row.CompanyID),
		Balance:           int(row.Balance),
		MonthlyAllowance:  int(row.MonthlyAllowance),
		MaxStock:          int(row.MaxStock),
		LastReplenishedAt: row.LastReplenishedAt.Time,
		CreatedAt:         row.CreatedAt.Time,
		UpdatedAt:         row.UpdatedAt.Time,
	}
}

// --- ScoutCreditLedgerRepository ---

type ScoutCreditLedgerRepository struct {
	queries *generated.Queries
}

var _ port.ScoutCreditLedgerRepository = (*ScoutCreditLedgerRepository)(nil)

func NewScoutCreditLedgerRepository(pool *pgxpool.Pool) *ScoutCreditLedgerRepository {
	return &ScoutCreditLedgerRepository{queries: generated.New(pool)}
}

func (r *ScoutCreditLedgerRepository) Create(ctx context.Context, entry *scout.CreditLedgerEntry) error {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(entry.CompanyID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.CreateScoutCreditLedger(ctx, &generated.CreateScoutCreditLedgerParams{
		CompanyID:      pgCompanyID,
		Delta:          int32(entry.Delta),
		Reason:         entry.Reason,
		ScoutMessageID: optionalUUID(entry.ScoutMessageID),
		BalanceAfter:   int32(entry.BalanceAfter),
	})
}
