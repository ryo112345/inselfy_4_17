package sqlc

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type WorkValuesSessionRepository struct {
	pool *pgxpool.Pool
}

var _ port.WorkValuesSessionRepository = (*WorkValuesSessionRepository)(nil)

func NewWorkValuesSessionRepository(pool *pgxpool.Pool) *WorkValuesSessionRepository {
	return &WorkValuesSessionRepository{pool: pool}
}

func (r *WorkValuesSessionRepository) Create(ctx context.Context, s *workvalues.Session) (*workvalues.Session, error) {
	pairsJSON, err := json.Marshal(s.InitialPairs)
	if err != nil {
		return nil, err
	}

	userID, err := parseUUID(s.UserID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}

	conn := r.connForContext(ctx)
	var id, status string
	var createdAt time.Time
	err = conn.QueryRow(ctx,
		`INSERT INTO wv_sessions (user_id, status, initial_pairs)
		 VALUES ($1, $2, $3)
		 RETURNING id, status, created_at`,
		userID, workvalues.StatusInProgress, pairsJSON,
	).Scan(&id, &status, &createdAt)
	if err != nil {
		return nil, err
	}

	return &workvalues.Session{
		ID:           id,
		UserID:       s.UserID,
		Status:       status,
		InitialPairs: s.InitialPairs,
		CreatedAt:    createdAt,
	}, nil
}

func (r *WorkValuesSessionRepository) GetByID(ctx context.Context, id string) (*workvalues.Session, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}

	conn := r.connForContext(ctx)
	var s workvalues.Session
	var pairsJSON []byte
	var completedAt *time.Time
	err = conn.QueryRow(ctx,
		`SELECT id, user_id, status, initial_pairs, created_at, completed_at
		 FROM wv_sessions WHERE id = $1`,
		uuid,
	).Scan(&s.ID, &s.UserID, &s.Status, &pairsJSON, &s.CreatedAt, &completedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}

	if err := json.Unmarshal(pairsJSON, &s.InitialPairs); err != nil {
		return nil, err
	}
	s.CompletedAt = completedAt
	return &s, nil
}

func (r *WorkValuesSessionRepository) UpdateStatus(ctx context.Context, id, status string) error {
	uuid, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}

	conn := r.connForContext(ctx)
	var query string
	if status == workvalues.StatusCompleted {
		query = `UPDATE wv_sessions SET status = $2, completed_at = NOW() WHERE id = $1`
	} else {
		query = `UPDATE wv_sessions SET status = $2 WHERE id = $1`
	}

	tag, err := conn.Exec(ctx, query, uuid, status)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}

type dbConn interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (interface{ RowsAffected() int64 }, error)
}

func (r *WorkValuesSessionRepository) connForContext(ctx context.Context) *pgxpool.Pool {
	return r.pool
}
