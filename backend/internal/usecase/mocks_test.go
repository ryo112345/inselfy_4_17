package usecase_test

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/education"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/domain/skill"
	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
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

type talentSearchQueryStub struct {
	searchCardsFn     func(ctx context.Context, f talentsearch.Filter, limit, offset int) ([]talentsearch.Card, int, error)
	filteredUserIDsFn func(ctx context.Context, f talentsearch.Filter) ([]string, error)
	teamCompanyIDFn   func(ctx context.Context, teamID string) (string, error)
	teamWVFn          func(ctx context.Context, teamID string) (map[string]float64, error)
	teamCIFn          func(ctx context.Context, teamID string) ([6]float64, error)
	publicWVFn        func(ctx context.Context, filterUserIDs []string) ([]talentsearch.UserWVScores, error)
	publicCIFn        func(ctx context.Context, filterUserIDs []string) ([]talentsearch.UserCIScores, error)
	cardsByUserIDsFn  func(ctx context.Context, userIDs []string) ([]talentsearch.Card, error)
	wvByUserIDsFn     func(ctx context.Context, userIDs []string) (map[string]map[string]float64, error)
	ciByUserIDsFn     func(ctx context.Context, userIDs []string) (map[string][6]float64, error)
}

func (s *talentSearchQueryStub) SearchCards(ctx context.Context, f talentsearch.Filter, limit, offset int) ([]talentsearch.Card, int, error) {
	return s.searchCardsFn(ctx, f, limit, offset)
}
func (s *talentSearchQueryStub) FilteredUserIDs(ctx context.Context, f talentsearch.Filter) ([]string, error) {
	return s.filteredUserIDsFn(ctx, f)
}
func (s *talentSearchQueryStub) TeamCompanyID(ctx context.Context, teamID string) (string, error) {
	return s.teamCompanyIDFn(ctx, teamID)
}
func (s *talentSearchQueryStub) TeamAverageWVDisplayScores(ctx context.Context, teamID string) (map[string]float64, error) {
	return s.teamWVFn(ctx, teamID)
}
func (s *talentSearchQueryStub) TeamAverageCIScores(ctx context.Context, teamID string) ([6]float64, error) {
	return s.teamCIFn(ctx, teamID)
}
func (s *talentSearchQueryStub) PublicUserWVScores(ctx context.Context, filterUserIDs []string) ([]talentsearch.UserWVScores, error) {
	return s.publicWVFn(ctx, filterUserIDs)
}
func (s *talentSearchQueryStub) PublicUserCIScores(ctx context.Context, filterUserIDs []string) ([]talentsearch.UserCIScores, error) {
	return s.publicCIFn(ctx, filterUserIDs)
}

// cardsByUserIDs defaults to fabricating a bare card per id, mirroring the
// gateway's "ordered, missing dropped" contract.
func (s *talentSearchQueryStub) CardsByUserIDs(ctx context.Context, userIDs []string) ([]talentsearch.Card, error) {
	if s.cardsByUserIDsFn != nil {
		return s.cardsByUserIDsFn(ctx, userIDs)
	}
	cards := make([]talentsearch.Card, len(userIDs))
	for i, id := range userIDs {
		cards[i] = talentsearch.Card{UserID: id, Username: "u-" + id, Name: "user " + id}
	}
	return cards, nil
}
func (s *talentSearchQueryStub) WVScoresByUserIDs(ctx context.Context, userIDs []string) (map[string]map[string]float64, error) {
	if s.wvByUserIDsFn == nil {
		return map[string]map[string]float64{}, nil
	}
	return s.wvByUserIDsFn(ctx, userIDs)
}
func (s *talentSearchQueryStub) CIScoresByUserIDs(ctx context.Context, userIDs []string) (map[string][6]float64, error) {
	if s.ciByUserIDsFn == nil {
		return map[string][6]float64{}, nil
	}
	return s.ciByUserIDsFn(ctx, userIDs)
}

// Unused placeholders to avoid "imported and not used" warnings if a test file
// grows to reference a subset; imports are needed for the stub signatures.
var (
	_ = education.ErrSchoolRequired
)
