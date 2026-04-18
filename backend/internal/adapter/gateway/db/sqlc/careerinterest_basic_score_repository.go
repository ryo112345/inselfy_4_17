package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CareerInterestBasicScoreRepository struct {
	pool *pgxpool.Pool
}

var _ port.CareerInterestBasicScoreRepository = (*CareerInterestBasicScoreRepository)(nil)

func NewCareerInterestBasicScoreRepository(pool *pgxpool.Pool) *CareerInterestBasicScoreRepository {
	return &CareerInterestBasicScoreRepository{pool: pool}
}

func (r *CareerInterestBasicScoreRepository) Save(ctx context.Context, sessionID string, scores []careerinterest.BasicScore) error {
	sid, err := parseUUID(sessionID)
	if err != nil {
		return err
	}

	for _, s := range scores {
		_, err := r.pool.Exec(ctx,
			`INSERT INTO career_interest_basic_scores (session_id, basic_interest_id, score, rank)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (session_id, basic_interest_id) DO UPDATE SET score = $3, rank = $4`,
			sid, s.BasicInterestID, float32(s.Score), int16(s.Rank),
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *CareerInterestBasicScoreRepository) GetBySessionID(ctx context.Context, sessionID string) ([]careerinterest.BasicScore, error) {
	sid, err := parseUUID(sessionID)
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx,
		`SELECT basic_interest_id, score, rank
		 FROM career_interest_basic_scores
		 WHERE session_id = $1
		 ORDER BY rank`,
		sid,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scores []careerinterest.BasicScore
	for rows.Next() {
		var s careerinterest.BasicScore
		var score float32
		var rank int16
		if err := rows.Scan(&s.BasicInterestID, &score, &rank); err != nil {
			return nil, err
		}
		s.Score = float64(score)
		s.Rank = int(rank)
		scores = append(scores, s)
	}
	return scores, rows.Err()
}
