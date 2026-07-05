package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/port"
)

// JobApplicationQueryService reads diagnostic score data for enriching
// company-facing application lists. The team/user score reads are identical
// to talent search, so they are reused via embedding.
type JobApplicationQueryService struct {
	*TalentSearchQueryService
}

var _ port.JobApplicationQueryService = (*JobApplicationQueryService)(nil)

func NewJobApplicationQueryService(pool *pgxpool.Pool) *JobApplicationQueryService {
	return &JobApplicationQueryService{NewTalentSearchQueryService(pool)}
}

func (s *JobApplicationQueryService) JobPostingTeamIDs(ctx context.Context, jobPostingIDs []string) (map[string]string, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, team_id FROM job_postings WHERE id = ANY($1) AND team_id IS NOT NULL`,
		lenientUUIDs(jobPostingIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	teams := make(map[string]string)
	for rows.Next() {
		var jpID, teamID pgtype.UUID
		if rows.Scan(&jpID, &teamID) == nil {
			teams[uuidToString(jpID)] = uuidToString(teamID)
		}
	}
	return teams, nil
}
