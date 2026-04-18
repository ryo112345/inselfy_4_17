package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type WorkValuesScoreRepository struct {
	pool *pgxpool.Pool
}

var _ port.WorkValuesScoreRepository = (*WorkValuesScoreRepository)(nil)

func NewWorkValuesScoreRepository(pool *pgxpool.Pool) *WorkValuesScoreRepository {
	return &WorkValuesScoreRepository{pool: pool}
}

func (r *WorkValuesScoreRepository) Save(ctx context.Context, sessionID string, scores []workvalues.ValueScore) error {
	sid, err := parseUUID(sessionID)
	if err != nil {
		return err
	}

	for _, s := range scores {
		_, err := r.pool.Exec(ctx,
			`INSERT INTO work_values_scores (session_id, value_id, mu, display_score, rank)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (session_id, value_id) DO UPDATE SET mu = $3, display_score = $4, rank = $5`,
			sid, s.ValueID, float32(s.Mu), float32(s.DisplayScore), int16(s.Rank),
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *WorkValuesScoreRepository) GetBySessionID(ctx context.Context, sessionID string) ([]workvalues.ValueScore, error) {
	sid, err := parseUUID(sessionID)
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx,
		`SELECT value_id, mu, display_score, rank
		 FROM work_values_scores
		 WHERE session_id = $1
		 ORDER BY rank`,
		sid,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scores []workvalues.ValueScore
	for rows.Next() {
		var s workvalues.ValueScore
		var mu, ds float32
		var rank int16
		if err := rows.Scan(&s.ValueID, &mu, &ds, &rank); err != nil {
			return nil, err
		}
		s.Mu = float64(mu)
		s.DisplayScore = float64(ds)
		s.Rank = int(rank)
		scores = append(scores, s)
	}
	return scores, rows.Err()
}
