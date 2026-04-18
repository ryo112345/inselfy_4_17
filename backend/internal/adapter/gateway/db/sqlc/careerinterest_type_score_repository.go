package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CareerInterestTypeScoreRepository struct {
	pool *pgxpool.Pool
}

var _ port.CareerInterestTypeScoreRepository = (*CareerInterestTypeScoreRepository)(nil)

func NewCareerInterestTypeScoreRepository(pool *pgxpool.Pool) *CareerInterestTypeScoreRepository {
	return &CareerInterestTypeScoreRepository{pool: pool}
}

func (r *CareerInterestTypeScoreRepository) Save(ctx context.Context, sessionID string, scores []careerinterest.TypeScore) error {
	sid, err := parseUUID(sessionID)
	if err != nil {
		return err
	}

	for _, s := range scores {
		_, err := r.pool.Exec(ctx,
			`INSERT INTO career_interest_type_scores (session_id, type_id, score, rank)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (session_id, type_id) DO UPDATE SET score = $3, rank = $4`,
			sid, s.TypeID, float32(s.Score), int16(s.Rank),
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *CareerInterestTypeScoreRepository) GetBySessionID(ctx context.Context, sessionID string) ([]careerinterest.TypeScore, error) {
	sid, err := parseUUID(sessionID)
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx,
		`SELECT type_id, score, rank
		 FROM career_interest_type_scores
		 WHERE session_id = $1
		 ORDER BY rank`,
		sid,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scores []careerinterest.TypeScore
	for rows.Next() {
		var s careerinterest.TypeScore
		var score float32
		var rank int16
		if err := rows.Scan(&s.TypeID, &score, &rank); err != nil {
			return nil, err
		}
		s.Score = float64(score)
		s.Rank = int(rank)
		scores = append(scores, s)
	}
	return scores, rows.Err()
}
