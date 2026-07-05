package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/port"
)

type SavedCandidateRepository struct {
	pool *pgxpool.Pool
}

var _ port.SavedCandidateRepository = (*SavedCandidateRepository)(nil)

func NewSavedCandidateRepository(pool *pgxpool.Pool) *SavedCandidateRepository {
	return &SavedCandidateRepository{pool: pool}
}

func (r *SavedCandidateRepository) Save(ctx context.Context, companyID, userID string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO saved_candidates (company_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		lenientUUID(companyID), lenientUUID(userID))
	return err
}

func (r *SavedCandidateRepository) Delete(ctx context.Context, companyID, userID string) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM saved_candidates WHERE company_id = $1 AND user_id = $2`,
		lenientUUID(companyID), lenientUUID(userID))
	return err
}

func (r *SavedCandidateRepository) Exists(ctx context.Context, companyID, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM saved_candidates WHERE company_id = $1 AND user_id = $2)`,
		lenientUUID(companyID), lenientUUID(userID)).Scan(&exists)
	return exists, err
}

func (r *SavedCandidateRepository) SavedSet(ctx context.Context, companyID string, userIDs []string) (map[string]bool, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT user_id FROM saved_candidates WHERE company_id = $1 AND user_id = ANY($2)`,
		lenientUUID(companyID), lenientUUIDs(userIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	savedSet := make(map[string]bool)
	for rows.Next() {
		var uid pgtype.UUID
		if err := rows.Scan(&uid); err != nil {
			continue
		}
		savedSet[uuidToString(uid)] = true
	}
	return savedSet, nil
}

func (r *SavedCandidateRepository) Count(ctx context.Context, companyID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM saved_candidates WHERE company_id = $1`,
		lenientUUID(companyID)).Scan(&count)
	return count, err
}
