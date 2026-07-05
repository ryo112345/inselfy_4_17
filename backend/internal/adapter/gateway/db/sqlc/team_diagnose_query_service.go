package sqlc

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/company"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type TeamDiagnoseQueryService struct {
	pool *pgxpool.Pool
}

var _ port.TeamDiagnoseQueryService = (*TeamDiagnoseQueryService)(nil)

func NewTeamDiagnoseQueryService(pool *pgxpool.Pool) *TeamDiagnoseQueryService {
	return &TeamDiagnoseQueryService{pool: pool}
}

func (s *TeamDiagnoseQueryService) GetByInviteToken(ctx context.Context, token string) (*company.TeamDiagnoseInfo, error) {
	var info company.TeamDiagnoseInfo
	var memberID, userID uuid.UUID

	err := s.pool.QueryRow(ctx,
		`SELECT tm.id, tm.user_id, tm.name, tm.email, tm.wv_status, tm.ci_status,
			t.name AS team_name, ca.company_name
		 FROM team_members tm
		 JOIN teams t ON t.id = tm.team_id
		 JOIN company_accounts ca ON ca.id = t.company_id
		 WHERE tm.invite_token = $1`, token,
	).Scan(&memberID, &userID, &info.MemberName, &info.Email, &info.WVStatus, &info.CIStatus, &info.TeamName, &info.CompanyName)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}

	info.MemberID = memberID.String()
	info.UserID = userID.String()
	return &info, nil
}
