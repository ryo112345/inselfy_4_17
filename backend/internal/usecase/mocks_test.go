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
	createFn      func(ctx context.Context, u *user.User) (*user.User, error)
	updateProfile func(ctx context.Context, id string, in user.UpdateProfileInput) (*user.User, error)
}

func (s *userRepoStub) Create(ctx context.Context, u *user.User) (*user.User, error) {
	return s.createFn(ctx, u)
}
func (s *userRepoStub) GetByUsername(ctx context.Context, u user.Username) (*user.User, error) {
	return s.getByUsername(ctx, u)
}
func (s *userRepoStub) UpdateProfile(ctx context.Context, id string, in user.UpdateProfileInput) (*user.User, error) {
	return s.updateProfile(ctx, id, in)
}

type userOutputStub struct {
	presented *user.User
}

func (s *userOutputStub) PresentUser(_ context.Context, u *user.User) error {
	s.presented = u
	return nil
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

type experienceOutputStub struct {
	presentedSingle *experience.Experience
	presentedList   []*experience.Experience
}

func (s *experienceOutputStub) PresentExperience(_ context.Context, e *experience.Experience) error {
	s.presentedSingle = e
	return nil
}
func (s *experienceOutputStub) PresentExperiences(_ context.Context, es []*experience.Experience) error {
	s.presentedList = es
	return nil
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

type skillOutputStub struct {
	presentedSingle *skill.UserSkill
	presentedList   []*skill.UserSkill
}

func (s *skillOutputStub) PresentSkill(_ context.Context, us *skill.UserSkill) error {
	s.presentedSingle = us
	return nil
}
func (s *skillOutputStub) PresentSkills(_ context.Context, list []*skill.UserSkill) error {
	s.presentedList = list
	return nil
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
