// Package db implements gateway repositories backed by PostgreSQL via pgx.
package db

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// UserRepository is a PostgreSQL-backed user repository.
type UserRepository struct {
	pool *pgxpool.Pool
}

var _ port.UserRepository = (*UserRepository)(nil)

// NewUserRepository creates a UserRepository.
func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

// Create inserts a new user and returns the persisted entity.
func (r *UserRepository) Create(ctx context.Context, u *user.User) (*user.User, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO users (username, name) VALUES ($1, $2)
		 RETURNING id, username, name, created_at, updated_at`,
		u.Username.String(), u.Name,
	)
	var (
		id        string
		username  string
		name      string
		createdAt time.Time
		updatedAt time.Time
	)
	if err := row.Scan(&id, &username, &name, &createdAt, &updatedAt); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, domainerr.ErrConflict
		}
		return nil, err
	}
	parsed, err := user.ParseUsername(username)
	if err != nil {
		return nil, err
	}
	return &user.User{
		ID:        id,
		Username:  parsed,
		Name:      name,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}, nil
}

// GetByUsername fetches a user by username.
func (r *UserRepository) GetByUsername(ctx context.Context, username user.Username) (*user.User, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, username, name, created_at, updated_at FROM users WHERE username = $1`,
		username.String(),
	)
	var (
		id        string
		uname     string
		name      string
		createdAt time.Time
		updatedAt time.Time
	)
	if err := row.Scan(&id, &uname, &name, &createdAt, &updatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	parsed, err := user.ParseUsername(uname)
	if err != nil {
		return nil, err
	}
	return &user.User{
		ID:        id,
		Username:  parsed,
		Name:      name,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}, nil
}
