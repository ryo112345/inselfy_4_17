package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CareerInterestReportQueryService struct {
	pool *pgxpool.Pool
}

var _ port.CareerInterestReportQueryService = (*CareerInterestReportQueryService)(nil)

func NewCareerInterestReportQueryService(pool *pgxpool.Pool) *CareerInterestReportQueryService {
	return &CareerInterestReportQueryService{pool: pool}
}

func (s *CareerInterestReportQueryService) ExistsBySessionID(ctx context.Context, sessionID string) (bool, error) {
	sid, err := parseUUID(sessionID)
	if err != nil {
		return false, domainerr.ErrBadRequest
	}
	var exists bool
	err = s.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM ci_ai_reports WHERE session_id = $1)`,
		sid,
	).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func (s *CareerInterestReportQueryService) RequestedBySessionID(ctx context.Context, sessionID string) (bool, error) {
	sid, err := parseUUID(sessionID)
	if err != nil {
		return false, domainerr.ErrBadRequest
	}
	var requested bool
	err = s.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM career_interest_sessions
		 WHERE id = $1 AND report_requested_at IS NOT NULL)`,
		sid,
	).Scan(&requested)
	if err != nil {
		return false, err
	}
	return requested, nil
}
