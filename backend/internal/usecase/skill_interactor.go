package usecase

import (
	"context"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/skill"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// SkillInteractor handles skill use cases.
//
// Attach uses a transaction because it performs two writes (upsert into the
// global `skills` table and insert into `user_skills`); a failure between the
// two would leave an orphan tag without attachment otherwise.
type SkillInteractor struct {
	repo     port.SkillRepository
	userRepo port.UserRepository
	tx       port.TxManager
}

var _ port.SkillInputPort = (*SkillInteractor)(nil)

// NewSkillInteractor creates a SkillInteractor.
func NewSkillInteractor(
	repo port.SkillRepository,
	userRepo port.UserRepository,
	tx port.TxManager,
) *SkillInteractor {
	return &SkillInteractor{repo: repo, userRepo: userRepo, tx: tx}
}

// Attach adds a skill by name to the user. Idempotent at the DB layer (ON
// CONFLICT DO NOTHING) but surfaces a conflict to the caller so the frontend
// can distinguish "already attached" from "newly attached".
func (i *SkillInteractor) Attach(ctx context.Context, authUserID, rawUsername, rawName string) (*skill.UserSkill, error) {
	u, err := i.resolveOwnedUser(ctx, authUserID, rawUsername)
	if err != nil {
		return nil, err
	}
	name, err := skill.ValidateName(rawName)
	if err != nil {
		return nil, err
	}

	has, err := i.repo.UserHasSkillName(ctx, u.ID, name)
	if err != nil {
		return nil, err
	}
	if has {
		return nil, domainerr.ErrConflict
	}
	count, err := i.repo.CountByUserID(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	if count >= skill.MaxPerUser {
		return nil, skill.ErrTooManyEntries
	}

	var attached *skill.UserSkill
	err = i.tx.WithinTransaction(ctx, func(ctx context.Context) error {
		s, err := i.repo.UpsertSkill(ctx, name)
		if err != nil {
			return err
		}
		if err := i.repo.AttachToUser(ctx, u.ID, s.ID); err != nil {
			return err
		}
		list, err := i.repo.ListByUserID(ctx, u.ID)
		if err != nil {
			return err
		}
		for _, us := range list {
			if us.Name == name {
				attached = us
				return nil
			}
		}
		return domainerr.ErrNotFound
	})
	if err != nil {
		return nil, err
	}
	return attached, nil
}

// DetachByName removes the user's attachment to a skill by skill name.
func (i *SkillInteractor) DetachByName(ctx context.Context, authUserID, rawUsername, rawName string) error {
	u, err := i.resolveOwnedUser(ctx, authUserID, rawUsername)
	if err != nil {
		return err
	}
	name, err := skill.ValidateName(rawName)
	if err != nil {
		return err
	}
	return i.repo.DetachFromUserByName(ctx, u.ID, name)
}

// List returns the user's attached skills.
func (i *SkillInteractor) List(ctx context.Context, rawUsername string) ([]*skill.UserSkill, error) {
	u, err := i.resolveUser(ctx, rawUsername)
	if err != nil {
		return nil, err
	}
	return i.repo.ListByUserID(ctx, u.ID)
}

func (i *SkillInteractor) resolveUser(ctx context.Context, raw string) (*user.User, error) {
	username, err := user.ParseUsername(raw)
	if err != nil {
		return nil, err
	}
	return i.userRepo.GetByUsername(ctx, username)
}

// resolveOwnedUser resolves the path user and verifies the authenticated
// caller IS that user (see ExperienceInteractor.resolveOwnedUser).
func (i *SkillInteractor) resolveOwnedUser(ctx context.Context, authUserID, raw string) (*user.User, error) {
	u, err := i.resolveUser(ctx, raw)
	if err != nil {
		return nil, err
	}
	if u.ID != authUserID {
		return nil, port.ErrForbidden
	}
	return u, nil
}
