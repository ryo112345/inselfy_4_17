package sqlc

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
)

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// mapForeignKeyNotFound converts Postgres foreign-key violations (code 23503)
// into domainerr.ErrNotFound. This is used by child-table repositories where
// a missing parent row is a 404, not a 500.
func mapForeignKeyNotFound(err error) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		return domainerr.ErrNotFound
	}
	return err
}
