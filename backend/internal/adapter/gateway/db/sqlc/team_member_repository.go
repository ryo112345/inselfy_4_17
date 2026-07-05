package sqlc

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type TeamMemberRepository struct {
	pool *pgxpool.Pool
}

var _ port.TeamMemberRepository = (*TeamMemberRepository)(nil)

func NewTeamMemberRepository(pool *pgxpool.Pool) *TeamMemberRepository {
	return &TeamMemberRepository{pool: pool}
}

func (r *TeamMemberRepository) MarkWVCompleted(ctx context.Context, inviteToken string) error {
	return r.markCompleted(ctx, "wv_status", inviteToken)
}

func (r *TeamMemberRepository) MarkCICompleted(ctx context.Context, inviteToken string) error {
	return r.markCompleted(ctx, "ci_status", inviteToken)
}

func (r *TeamMemberRepository) markCompleted(ctx context.Context, column, inviteToken string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE team_members SET `+column+` = 'completed', updated_at = $1 WHERE invite_token = $2`,
		time.Now(), inviteToken,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}
