package sqlc

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CareerInterestResultRepository struct {
	pool *pgxpool.Pool
}

var _ port.CareerInterestResultRepository = (*CareerInterestResultRepository)(nil)

func NewCareerInterestResultRepository(pool *pgxpool.Pool) *CareerInterestResultRepository {
	return &CareerInterestResultRepository{pool: pool}
}

func (r *CareerInterestResultRepository) Create(ctx context.Context, result *careerinterest.Result) (*careerinterest.Result, error) {
	responsesJSON, err := json.Marshal(result.Responses)
	if err != nil {
		return nil, err
	}

	sessionID, err := parseUUID(result.SessionID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	userID, err := parseUUID(result.UserID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}

	var sd *float32
	if result.DifferentiationSD != nil {
		v := float32(*result.DifferentiationSD)
		sd = &v
	}

	err = r.pool.QueryRow(ctx,
		`INSERT INTO career_interest_results (session_id, user_id, responses, question_count, differentiation_sd, differentiation_level)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, created_at`,
		sessionID, userID, responsesJSON,
		int16(result.QuestionCount), sd, result.DifferentiationLevel,
	).Scan(&result.ID, &result.CreatedAt)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *CareerInterestResultRepository) GetLatestByUserID(ctx context.Context, userID string) (*careerinterest.Result, error) {
	uid, err := parseUUID(userID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}

	var result careerinterest.Result
	var responsesJSON []byte
	var sd *float32
	var qc int16

	err = r.pool.QueryRow(ctx,
		`SELECT id, session_id, user_id, responses, question_count,
		        differentiation_sd, differentiation_level, created_at
		 FROM career_interest_results
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT 1`,
		uid,
	).Scan(
		&result.ID, &result.SessionID, &result.UserID,
		&responsesJSON, &qc, &sd, &result.DifferentiationLevel, &result.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}

	if err := json.Unmarshal(responsesJSON, &result.Responses); err != nil {
		return nil, err
	}
	if sd != nil {
		v := float64(*sd)
		result.DifferentiationSD = &v
	}
	result.QuestionCount = int(qc)

	return &result, nil
}

func (r *CareerInterestResultRepository) GetBySessionID(ctx context.Context, sessionID string) (*careerinterest.Result, error) {
	sid, err := parseUUID(sessionID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}

	var result careerinterest.Result
	var responsesJSON []byte
	var sd *float32
	var qc int16

	err = r.pool.QueryRow(ctx,
		`SELECT id, session_id, user_id, responses, question_count,
		        differentiation_sd, differentiation_level, created_at
		 FROM career_interest_results
		 WHERE session_id = $1
		 LIMIT 1`,
		sid,
	).Scan(
		&result.ID, &result.SessionID, &result.UserID,
		&responsesJSON, &qc, &sd, &result.DifferentiationLevel, &result.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}

	if err := json.Unmarshal(responsesJSON, &result.Responses); err != nil {
		return nil, err
	}
	if sd != nil {
		v := float64(*sd)
		result.DifferentiationSD = &v
	}
	result.QuestionCount = int(qc)

	return &result, nil
}
