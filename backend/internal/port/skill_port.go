package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/skill"
)

// SkillInputPort defines skill use case input methods.
type SkillInputPort interface {
	Attach(ctx context.Context, authUserID, username string, name string) (*skill.UserSkill, error)
	DetachByName(ctx context.Context, authUserID, username, name string) error
	List(ctx context.Context, username string) ([]*skill.UserSkill, error)
}

// SkillRepository abstracts skill persistence.
type SkillRepository interface {
	// UpsertSkill returns the global skill row for `name`, inserting it if missing.
	UpsertSkill(ctx context.Context, name string) (*skill.Skill, error)
	// AttachToUser associates a skill (by id) with a user. Idempotent.
	AttachToUser(ctx context.Context, userID, skillID string) error
	// DetachFromUserByName removes the association. Returns ErrNotFound if no row removed.
	DetachFromUserByName(ctx context.Context, userID, name string) error
	// ListByUserID returns the user's attached skills in attachment order.
	ListByUserID(ctx context.Context, userID string) ([]*skill.UserSkill, error)
	// CountByUserID returns the number of skills attached to the user.
	CountByUserID(ctx context.Context, userID string) (int64, error)
	// UserHasSkillName returns true if the user already has the skill.
	UserHasSkillName(ctx context.Context, userID, name string) (bool, error)
}
