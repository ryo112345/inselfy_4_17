package usecase_test

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/education"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/domain/skill"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
)

type userRepoStub struct {
	getByUsername func(ctx context.Context, u user.Username) (*user.User, error)
	getByIDFn     func(ctx context.Context, id string) (*user.User, error)
	createFn      func(ctx context.Context, u *user.User) (*user.User, error)
	updateProfile func(ctx context.Context, id string, in user.UpdateProfileInput) (*user.User, error)
}

func (s *userRepoStub) Create(ctx context.Context, u *user.User) (*user.User, error) {
	return s.createFn(ctx, u)
}
func (s *userRepoStub) GetByUsername(ctx context.Context, u user.Username) (*user.User, error) {
	return s.getByUsername(ctx, u)
}
func (s *userRepoStub) GetByID(ctx context.Context, id string) (*user.User, error) {
	if s.getByIDFn != nil {
		return s.getByIDFn(ctx, id)
	}
	return nil, nil
}
func (s *userRepoStub) GetByOAuthProvider(_ context.Context, _, _ string) (*user.User, error) {
	return nil, nil
}
func (s *userRepoStub) UpdateProfile(ctx context.Context, id string, in user.UpdateProfileInput) (*user.User, error) {
	return s.updateProfile(ctx, id, in)
}

type experienceRepoStub struct {
	createFn        func(ctx context.Context, e *experience.Experience) (*experience.Experience, error)
	updateFn        func(ctx context.Context, e *experience.Experience) (*experience.Experience, error)
	deleteFn        func(ctx context.Context, id string) error
	getByIDFn       func(ctx context.Context, id string) (*experience.Experience, error)
	listByUserIDFn  func(ctx context.Context, userID string) ([]*experience.Experience, error)
	countByUserIDFn func(ctx context.Context, userID string) (int64, error)
}

func (s *experienceRepoStub) Create(ctx context.Context, e *experience.Experience) (*experience.Experience, error) {
	return s.createFn(ctx, e)
}
func (s *experienceRepoStub) Update(ctx context.Context, e *experience.Experience) (*experience.Experience, error) {
	return s.updateFn(ctx, e)
}
func (s *experienceRepoStub) Delete(ctx context.Context, id string) error {
	return s.deleteFn(ctx, id)
}
func (s *experienceRepoStub) GetByID(ctx context.Context, id string) (*experience.Experience, error) {
	return s.getByIDFn(ctx, id)
}
func (s *experienceRepoStub) ListByUserID(ctx context.Context, userID string) ([]*experience.Experience, error) {
	return s.listByUserIDFn(ctx, userID)
}
func (s *experienceRepoStub) CountByUserID(ctx context.Context, userID string) (int64, error) {
	if s.countByUserIDFn == nil {
		return 0, nil
	}
	return s.countByUserIDFn(ctx, userID)
}

type skillRepoStub struct {
	upsertFn           func(ctx context.Context, name string) (*skill.Skill, error)
	attachFn           func(ctx context.Context, userID, skillID string) error
	detachByNameFn     func(ctx context.Context, userID, name string) error
	listByUserIDFn     func(ctx context.Context, userID string) ([]*skill.UserSkill, error)
	countByUserIDFn    func(ctx context.Context, userID string) (int64, error)
	userHasSkillNameFn func(ctx context.Context, userID, name string) (bool, error)
}

func (s *skillRepoStub) UpsertSkill(ctx context.Context, name string) (*skill.Skill, error) {
	return s.upsertFn(ctx, name)
}
func (s *skillRepoStub) AttachToUser(ctx context.Context, userID, skillID string) error {
	return s.attachFn(ctx, userID, skillID)
}
func (s *skillRepoStub) DetachFromUserByName(ctx context.Context, userID, name string) error {
	return s.detachByNameFn(ctx, userID, name)
}
func (s *skillRepoStub) ListByUserID(ctx context.Context, userID string) ([]*skill.UserSkill, error) {
	return s.listByUserIDFn(ctx, userID)
}
func (s *skillRepoStub) CountByUserID(ctx context.Context, userID string) (int64, error) {
	if s.countByUserIDFn == nil {
		return 0, nil
	}
	return s.countByUserIDFn(ctx, userID)
}
func (s *skillRepoStub) UserHasSkillName(ctx context.Context, userID, name string) (bool, error) {
	if s.userHasSkillNameFn == nil {
		return false, nil
	}
	return s.userHasSkillNameFn(ctx, userID, name)
}

// inlineTxManager runs fn within the same context (no real transaction). Good
// enough for usecase-level tests since repositories are mocked.
type inlineTxManager struct{}

func (inlineTxManager) WithinTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}

// Unused placeholders to avoid "imported and not used" warnings if a test file
// grows to reference a subset; imports are needed for the stub signatures.
var (
	_ = education.ErrSchoolRequired
)
