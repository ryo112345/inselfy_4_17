package sqlc

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/company"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyTeamQueryService struct {
	pool *pgxpool.Pool
}

var _ port.CompanyTeamQueryService = (*CompanyTeamQueryService)(nil)

func NewCompanyTeamQueryService(pool *pgxpool.Pool) *CompanyTeamQueryService {
	return &CompanyTeamQueryService{pool: pool}
}

func (s *CompanyTeamQueryService) ListTeamSummaries(ctx context.Context, companyID string) ([]company.TeamSummary, error) {
	parsedCompanyID, err := uuid.Parse(companyID)
	if err != nil {
		return nil, err
	}

	rows, err := s.pool.Query(ctx,
		`SELECT t.id, t.company_id, t.name, t.description, t.is_public, t.created_at,
			COUNT(tm.id) AS member_count,
			COUNT(CASE WHEN tm.wv_status = 'completed' THEN 1 END) AS wv_completed,
			COUNT(CASE WHEN tm.ci_status = 'completed' THEN 1 END) AS ci_completed
		 FROM teams t
		 LEFT JOIN team_members tm ON tm.team_id = t.id
		 WHERE t.company_id = $1
		 GROUP BY t.id
		 ORDER BY t.created_at DESC`, parsedCompanyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	teams := []company.TeamSummary{}
	for rows.Next() {
		var t company.TeamSummary
		var id, cid uuid.UUID
		if err := rows.Scan(&id, &cid, &t.Name, &t.Description, &t.IsPublic, &t.CreatedAt, &t.MemberCount, &t.WVCompleted, &t.CICompleted); err != nil {
			return nil, err
		}
		t.ID = id.String()
		t.CompanyID = cid.String()
		teams = append(teams, t)
	}
	return teams, rows.Err()
}

func (s *CompanyTeamQueryService) ListPublicTeams(ctx context.Context, companyID string) ([]company.PublicTeamInfo, error) {
	parsedCompanyID, err := uuid.Parse(companyID)
	if err != nil {
		return nil, err
	}

	rows, err := s.pool.Query(ctx,
		`SELECT t.id, t.name, COUNT(tm.id)
		 FROM teams t
		 LEFT JOIN team_members tm ON tm.team_id = t.id
		 WHERE t.company_id = $1 AND t.is_public = TRUE
		 GROUP BY t.id
		 ORDER BY t.created_at ASC`, parsedCompanyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	teams := []company.PublicTeamInfo{}
	for rows.Next() {
		var t company.PublicTeamInfo
		var id uuid.UUID
		if err := rows.Scan(&id, &t.Name, &t.MemberCount); err != nil {
			return nil, err
		}
		t.ID = id.String()
		teams = append(teams, t)
	}
	return teams, rows.Err()
}

func (s *CompanyTeamQueryService) ListMemberStates(ctx context.Context, teamID string) ([]company.TeamMemberState, error) {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return nil, err
	}

	rows, err := s.pool.Query(ctx,
		`SELECT id, user_id, name, wv_status, ci_status, is_ace FROM team_members WHERE team_id = $1 ORDER BY created_at ASC`,
		parsedTeamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := []company.TeamMemberState{}
	for rows.Next() {
		var m company.TeamMemberState
		var mid, uid uuid.UUID
		if err := rows.Scan(&mid, &uid, &m.Name, &m.WVStatus, &m.CIStatus, &m.IsAce); err != nil {
			return nil, err
		}
		m.MemberID = mid.String()
		m.UserID = uid.String()
		members = append(members, m)
	}
	return members, rows.Err()
}

func (s *CompanyTeamQueryService) ListUserWVScores(ctx context.Context, userID string) ([]company.ScoreRow, error) {
	return s.listScoreRows(ctx, userID,
		`SELECT ws.value_id, ws.display_score, ws.rank
		 FROM work_values_scores ws
		 JOIN work_values_sessions s ON s.id = ws.session_id
		 WHERE s.user_id = $1 AND s.status = 'completed'
		 ORDER BY s.completed_at DESC`)
}

func (s *CompanyTeamQueryService) ListUserCIScores(ctx context.Context, userID string) ([]company.ScoreRow, error) {
	return s.listScoreRows(ctx, userID,
		`SELECT ts.type_id, ts.score, ts.rank
		 FROM career_interest_type_scores ts
		 JOIN career_interest_sessions s ON s.id = ts.session_id
		 WHERE s.user_id = $1 AND s.status = 'completed'
		 ORDER BY s.completed_at DESC`)
}

func (s *CompanyTeamQueryService) listScoreRows(ctx context.Context, userID, query string) ([]company.ScoreRow, error) {
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	rows, err := s.pool.Query(ctx, query, parsedUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	scores := []company.ScoreRow{}
	for rows.Next() {
		var sc company.ScoreRow
		if err := rows.Scan(&sc.ID, &sc.DisplayScore, &sc.Rank); err != nil {
			return nil, err
		}
		scores = append(scores, sc)
	}
	return scores, rows.Err()
}

func (s *CompanyTeamQueryService) GetLatestWNMu(ctx context.Context, userID string) (map[string]float64, error) {
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	var muJSON []byte
	err = s.pool.QueryRow(ctx,
		`SELECT ns.mu
		 FROM work_needs_scores ns
		 JOIN work_values_sessions s ON s.id = ns.session_id
		 WHERE s.user_id = $1 AND s.status = 'completed'
		 ORDER BY s.completed_at DESC
		 LIMIT 1`, parsedUserID).Scan(&muJSON)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	var mu map[string]float64
	if err := json.Unmarshal(muJSON, &mu); err != nil {
		return nil, err
	}
	return mu, nil
}
