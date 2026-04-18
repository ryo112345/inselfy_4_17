package sqlc

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CareerInterestSessionRepository struct {
	pool *pgxpool.Pool
}

var _ port.CareerInterestSessionRepository = (*CareerInterestSessionRepository)(nil)

func NewCareerInterestSessionRepository(pool *pgxpool.Pool) *CareerInterestSessionRepository {
	return &CareerInterestSessionRepository{pool: pool}
}

func (r *CareerInterestSessionRepository) Create(ctx context.Context, s *careerinterest.Session) (*careerinterest.Session, error) {
	itemsJSON, err := json.Marshal(s.Items)
	if err != nil {
		return nil, err
	}

	userID, err := parseUUID(s.UserID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}

	var id, status string
	var createdAt time.Time
	err = r.pool.QueryRow(ctx,
		`INSERT INTO career_interest_sessions (user_id, status, items)
		 VALUES ($1, $2, $3)
		 RETURNING id, status, created_at`,
		userID, careerinterest.StatusInProgress, itemsJSON,
	).Scan(&id, &status, &createdAt)
	if err != nil {
		return nil, err
	}

	return &careerinterest.Session{
		ID:        id,
		UserID:    s.UserID,
		Status:    status,
		Items:     s.Items,
		CreatedAt: createdAt,
	}, nil
}

func (r *CareerInterestSessionRepository) GetByID(ctx context.Context, id string) (*careerinterest.Session, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}

	var s careerinterest.Session
	var itemsJSON []byte
	var completedAt *time.Time
	err = r.pool.QueryRow(ctx,
		`SELECT id, user_id, status, items, created_at, completed_at
		 FROM career_interest_sessions WHERE id = $1`,
		uuid,
	).Scan(&s.ID, &s.UserID, &s.Status, &itemsJSON, &s.CreatedAt, &completedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}

	if err := json.Unmarshal(itemsJSON, &s.Items); err != nil {
		return nil, err
	}
	s.CompletedAt = completedAt
	return &s, nil
}

func (r *CareerInterestSessionRepository) UpdateStatus(ctx context.Context, id, status string) error {
	uuid, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}

	var query string
	if status == careerinterest.StatusCompleted {
		query = `UPDATE career_interest_sessions SET status = $2, completed_at = NOW() WHERE id = $1`
	} else {
		query = `UPDATE career_interest_sessions SET status = $2 WHERE id = $1`
	}

	tag, err := r.pool.Exec(ctx, query, uuid, status)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}
