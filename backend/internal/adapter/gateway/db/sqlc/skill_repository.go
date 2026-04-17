package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/skill"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// SkillRepository is a sqlc-backed implementation of port.SkillRepository.
type SkillRepository struct {
	queries *generated.Queries
}

var _ port.SkillRepository = (*SkillRepository)(nil)

// NewSkillRepository creates a SkillRepository bound to the pool.
func NewSkillRepository(pool *pgxpool.Pool) *SkillRepository {
	return &SkillRepository{queries: generated.New(pool)}
}

func (r *SkillRepository) UpsertSkill(ctx context.Context, name string) (*skill.Skill, error) {
	q := queriesForContext(ctx, r.queries)
	row, err := q.UpsertSkill(ctx, name)
	if err != nil {
		return nil, err
	}
	return &skill.Skill{
		ID:   uuidToString(row.ID),
		Name: row.Name,
	}, nil
}

func (r *SkillRepository) AttachToUser(ctx context.Context, userID, skillID string) error {
	q := queriesForContext(ctx, r.queries)
	uID, err := parseUUID(userID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	sID, err := parseUUID(skillID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	if err := q.AttachUserSkill(ctx, &generated.AttachUserSkillParams{UserID: uID, SkillID: sID}); err != nil {
		return mapForeignKeyNotFound(err)
	}
	return nil
}

func (r *SkillRepository) DetachFromUserByName(ctx context.Context, userID, name string) error {
	q := queriesForContext(ctx, r.queries)
	uID, err := parseUUID(userID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	rows, err := q.DetachUserSkillByName(ctx, &generated.DetachUserSkillByNameParams{UserID: uID, Name: name})
	if err != nil {
		return err
	}
	if rows == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}

func (r *SkillRepository) ListByUserID(ctx context.Context, userID string) ([]*skill.UserSkill, error) {
	q := queriesForContext(ctx, r.queries)
	uID, err := parseUUID(userID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListUserSkills(ctx, uID)
	if err != nil {
		return nil, err
	}
	out := make([]*skill.UserSkill, 0, len(rows))
	for _, row := range rows {
		out = append(out, &skill.UserSkill{
			Skill: skill.Skill{
				ID:   uuidToString(row.ID),
				Name: row.Name,
			},
			AttachedAt: row.AttachedAt.Time,
		})
	}
	return out, nil
}

func (r *SkillRepository) CountByUserID(ctx context.Context, userID string) (int64, error) {
	q := queriesForContext(ctx, r.queries)
	uID, err := parseUUID(userID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	return q.CountUserSkills(ctx, uID)
}

func (r *SkillRepository) UserHasSkillName(ctx context.Context, userID, name string) (bool, error) {
	q := queriesForContext(ctx, r.queries)
	uID, err := parseUUID(userID)
	if err != nil {
		return false, domainerr.ErrBadRequest
	}
	return q.UserHasSkillName(ctx, &generated.UserHasSkillNameParams{UserID: uID, Name: name})
}
