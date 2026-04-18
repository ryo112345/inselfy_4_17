package sqlc

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type WorkValuesResultRepository struct {
	pool *pgxpool.Pool
}

var _ port.WorkValuesResultRepository = (*WorkValuesResultRepository)(nil)

func NewWorkValuesResultRepository(pool *pgxpool.Pool) *WorkValuesResultRepository {
	return &WorkValuesResultRepository{pool: pool}
}

func (r *WorkValuesResultRepository) Create(ctx context.Context, result *workvalues.Result) (*workvalues.Result, error) {
	responsesJSON, err := json.Marshal(result.Responses)
	if err != nil {
		return nil, err
	}
	muJSON, err := json.Marshal(result.Mu)
	if err != nil {
		return nil, err
	}
	seJSON, err := json.Marshal(result.SE)
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

	var cc *float32
	if result.ConsistencyCoefficient != nil {
		v := float32(*result.ConsistencyCoefficient)
		cc = &v
	}

	err = r.pool.QueryRow(ctx,
		`INSERT INTO work_needs_scores (session_id, user_id, responses, mu, se, consistency_coefficient, consistency_level, question_count)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, created_at`,
		sessionID, userID, responsesJSON, muJSON, seJSON,
		cc, result.ConsistencyLevel, int16(result.QuestionCount),
	).Scan(&result.ID, &result.CreatedAt)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *WorkValuesResultRepository) GetLatestByUserID(ctx context.Context, userID string) (*workvalues.Result, error) {
	uid, err := parseUUID(userID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}

	var result workvalues.Result
	var responsesJSON, muJSON, seJSON []byte
	var cc *float32
	var qc int16

	err = r.pool.QueryRow(ctx,
		`SELECT id, session_id, user_id, responses, mu, se,
		        consistency_coefficient, consistency_level, question_count, created_at
		 FROM work_needs_scores
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT 1`,
		uid,
	).Scan(
		&result.ID, &result.SessionID, &result.UserID,
		&responsesJSON, &muJSON, &seJSON,
		&cc, &result.ConsistencyLevel, &qc, &result.CreatedAt,
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
	if err := json.Unmarshal(muJSON, &result.Mu); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(seJSON, &result.SE); err != nil {
		return nil, err
	}
	if cc != nil {
		v := float64(*cc)
		result.ConsistencyCoefficient = &v
	}
	result.QuestionCount = int(qc)

	return &result, nil
}

func (r *WorkValuesResultRepository) GetBySessionID(ctx context.Context, sessionID string) (*workvalues.Result, error) {
	sid, err := parseUUID(sessionID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}

	var result workvalues.Result
	var responsesJSON, muJSON, seJSON []byte
	var cc *float32
	var qc int16

	err = r.pool.QueryRow(ctx,
		`SELECT id, session_id, user_id, responses, mu, se,
		        consistency_coefficient, consistency_level, question_count, created_at
		 FROM work_needs_scores
		 WHERE session_id = $1
		 LIMIT 1`,
		sid,
	).Scan(
		&result.ID, &result.SessionID, &result.UserID,
		&responsesJSON, &muJSON, &seJSON,
		&cc, &result.ConsistencyLevel, &qc, &result.CreatedAt,
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
	if err := json.Unmarshal(muJSON, &result.Mu); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(seJSON, &result.SE); err != nil {
		return nil, err
	}
	if cc != nil {
		v := float64(*cc)
		result.ConsistencyCoefficient = &v
	}
	result.QuestionCount = int(qc)

	return &result, nil
}
