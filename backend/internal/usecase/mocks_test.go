package usecase_test

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/education"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/domain/interview"
	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
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

type jobApplicationRepoStub struct {
	createFn               func(ctx context.Context, a *jobapplication.JobApplication) (*jobapplication.JobApplication, error)
	getByIDFn              func(ctx context.Context, id string) (*jobapplication.JobApplicationWithDetails, error)
	getByCandidateAndJobFn func(ctx context.Context, candidateID, jobPostingID string) (*jobapplication.JobApplication, error)
	listByCompanyIDFn      func(ctx context.Context, companyID string, filter jobapplication.ListFilter) ([]*jobapplication.JobApplicationWithDetails, int, error)
	listByCandidateIDFn    func(ctx context.Context, candidateID string) ([]*jobapplication.JobApplicationWithDetails, error)
	updateStatusFn         func(ctx context.Context, id string, status jobapplication.Status) error
}

func (s *jobApplicationRepoStub) Create(ctx context.Context, a *jobapplication.JobApplication) (*jobapplication.JobApplication, error) {
	return s.createFn(ctx, a)
}
func (s *jobApplicationRepoStub) GetByID(ctx context.Context, id string) (*jobapplication.JobApplicationWithDetails, error) {
	return s.getByIDFn(ctx, id)
}
func (s *jobApplicationRepoStub) GetByCandidateAndJob(ctx context.Context, candidateID, jobPostingID string) (*jobapplication.JobApplication, error) {
	return s.getByCandidateAndJobFn(ctx, candidateID, jobPostingID)
}
func (s *jobApplicationRepoStub) ListByCompanyID(ctx context.Context, companyID string, filter jobapplication.ListFilter) ([]*jobapplication.JobApplicationWithDetails, int, error) {
	return s.listByCompanyIDFn(ctx, companyID, filter)
}
func (s *jobApplicationRepoStub) ListByCandidateID(ctx context.Context, candidateID string) ([]*jobapplication.JobApplicationWithDetails, error) {
	return s.listByCandidateIDFn(ctx, candidateID)
}
func (s *jobApplicationRepoStub) UpdateStatus(ctx context.Context, id string, status jobapplication.Status) error {
	return s.updateStatusFn(ctx, id, status)
}

type jobApplicationQueryStub struct {
	jobPostingTeamIDsFn func(ctx context.Context, jobPostingIDs []string) (map[string]string, error)
	teamCompanyIDFn     func(ctx context.Context, teamID string) (string, error)
	teamWVFn            func(ctx context.Context, teamID string) (map[string]float64, error)
	teamCIFn            func(ctx context.Context, teamID string) ([6]float64, error)
	wvByUserIDsFn       func(ctx context.Context, userIDs []string) (map[string]map[string]float64, error)
	ciByUserIDsFn       func(ctx context.Context, userIDs []string) (map[string][6]float64, error)
}

func (s *jobApplicationQueryStub) JobPostingTeamIDs(ctx context.Context, jobPostingIDs []string) (map[string]string, error) {
	return s.jobPostingTeamIDsFn(ctx, jobPostingIDs)
}
func (s *jobApplicationQueryStub) TeamCompanyID(ctx context.Context, teamID string) (string, error) {
	return s.teamCompanyIDFn(ctx, teamID)
}
func (s *jobApplicationQueryStub) TeamAverageWVDisplayScores(ctx context.Context, teamID string) (map[string]float64, error) {
	return s.teamWVFn(ctx, teamID)
}
func (s *jobApplicationQueryStub) TeamAverageCIScores(ctx context.Context, teamID string) ([6]float64, error) {
	return s.teamCIFn(ctx, teamID)
}
func (s *jobApplicationQueryStub) WVScoresByUserIDs(ctx context.Context, userIDs []string) (map[string]map[string]float64, error) {
	return s.wvByUserIDsFn(ctx, userIDs)
}
func (s *jobApplicationQueryStub) CIScoresByUserIDs(ctx context.Context, userIDs []string) (map[string][6]float64, error) {
	return s.ciByUserIDsFn(ctx, userIDs)
}

type interviewProposalRepoStub struct {
	createFn                     func(ctx context.Context, p *interview.Proposal) (*interview.Proposal, error)
	getByIDFn                    func(ctx context.Context, id string) (*interview.Proposal, error)
	updateStatusFn               func(ctx context.Context, id, status string) error
	updateMessageIDFn            func(ctx context.Context, id, messageID string) error
	listPendingByCandidateFn     func(ctx context.Context, candidateID string) ([]*interview.Proposal, error)
	cancelPendingByApplicationFn func(ctx context.Context, applicationID string) ([]*interview.Proposal, error)
}

func (s *interviewProposalRepoStub) Create(ctx context.Context, p *interview.Proposal) (*interview.Proposal, error) {
	return s.createFn(ctx, p)
}
func (s *interviewProposalRepoStub) GetByID(ctx context.Context, id string) (*interview.Proposal, error) {
	return s.getByIDFn(ctx, id)
}
func (s *interviewProposalRepoStub) UpdateStatus(ctx context.Context, id, status string) error {
	if s.updateStatusFn != nil {
		return s.updateStatusFn(ctx, id, status)
	}
	return nil
}
func (s *interviewProposalRepoStub) UpdateMessageID(ctx context.Context, id, messageID string) error {
	if s.updateMessageIDFn != nil {
		return s.updateMessageIDFn(ctx, id, messageID)
	}
	return nil
}
func (s *interviewProposalRepoStub) ListPendingByCandidate(ctx context.Context, candidateID string) ([]*interview.Proposal, error) {
	if s.listPendingByCandidateFn != nil {
		return s.listPendingByCandidateFn(ctx, candidateID)
	}
	return nil, nil
}
func (s *interviewProposalRepoStub) CancelPendingByApplication(ctx context.Context, applicationID string) ([]*interview.Proposal, error) {
	if s.cancelPendingByApplicationFn != nil {
		return s.cancelPendingByApplicationFn(ctx, applicationID)
	}
	return nil, nil
}

type interviewSlotRepoStub struct {
	createFn         func(ctx context.Context, sl *interview.Slot) (*interview.Slot, error)
	getByIDFn        func(ctx context.Context, id string) (*interview.Slot, error)
	listByProposalFn func(ctx context.Context, proposalID string) ([]*interview.Slot, error)
	updateStatusFn   func(ctx context.Context, id, status string) error
	rejectOthersFn   func(ctx context.Context, proposalID, selectedID string) error
}

func (s *interviewSlotRepoStub) Create(ctx context.Context, sl *interview.Slot) (*interview.Slot, error) {
	return s.createFn(ctx, sl)
}
func (s *interviewSlotRepoStub) GetByID(ctx context.Context, id string) (*interview.Slot, error) {
	return s.getByIDFn(ctx, id)
}
func (s *interviewSlotRepoStub) ListByProposal(ctx context.Context, proposalID string) ([]*interview.Slot, error) {
	if s.listByProposalFn != nil {
		return s.listByProposalFn(ctx, proposalID)
	}
	return nil, nil
}
func (s *interviewSlotRepoStub) UpdateStatus(ctx context.Context, id, status string) error {
	if s.updateStatusFn != nil {
		return s.updateStatusFn(ctx, id, status)
	}
	return nil
}
func (s *interviewSlotRepoStub) RejectOthers(ctx context.Context, proposalID, selectedID string) error {
	if s.rejectOthersFn != nil {
		return s.rejectOthersFn(ctx, proposalID, selectedID)
	}
	return nil
}

type interviewRepoStub struct {
	createFn          func(ctx context.Context, iv *interview.Interview) (*interview.Interview, error)
	getByIDFn         func(ctx context.Context, id string) (*interview.Interview, error)
	listByCompanyFn   func(ctx context.Context, companyID string, from, to time.Time) ([]*interview.Interview, error)
	listByCandidateFn func(ctx context.Context, candidateID string) ([]*interview.Interview, error)
	updateStatusFn    func(ctx context.Context, id, status string) error
}

func (s *interviewRepoStub) Create(ctx context.Context, iv *interview.Interview) (*interview.Interview, error) {
	return s.createFn(ctx, iv)
}
func (s *interviewRepoStub) GetByID(ctx context.Context, id string) (*interview.Interview, error) {
	return s.getByIDFn(ctx, id)
}
func (s *interviewRepoStub) ListByCompany(ctx context.Context, companyID string, from, to time.Time) ([]*interview.Interview, error) {
	return s.listByCompanyFn(ctx, companyID, from, to)
}
func (s *interviewRepoStub) ListByCandidate(ctx context.Context, candidateID string) ([]*interview.Interview, error) {
	return s.listByCandidateFn(ctx, candidateID)
}
func (s *interviewRepoStub) UpdateStatus(ctx context.Context, id, status string) error {
	if s.updateStatusFn != nil {
		return s.updateStatusFn(ctx, id, status)
	}
	return nil
}

type conversationRepoStub struct {
	createFn                   func(ctx context.Context, conv *messaging.Conversation) (*messaging.Conversation, error)
	getByCompanyAndCandidateFn func(ctx context.Context, companyID, candidateID string) (*messaging.Conversation, error)
	updateLastMessageAtFn      func(ctx context.Context, id string) error
}

func (s *conversationRepoStub) Create(ctx context.Context, conv *messaging.Conversation) (*messaging.Conversation, error) {
	return s.createFn(ctx, conv)
}
func (s *conversationRepoStub) CreateCandidateConversation(_ context.Context, _ *messaging.Conversation) (*messaging.Conversation, error) {
	return nil, nil
}
func (s *conversationRepoStub) GetByID(_ context.Context, _ string) (*messaging.ConversationWithPreview, error) {
	return nil, nil
}
func (s *conversationRepoStub) GetByCompanyAndCandidate(ctx context.Context, companyID, candidateID string) (*messaging.Conversation, error) {
	return s.getByCompanyAndCandidateFn(ctx, companyID, candidateID)
}
func (s *conversationRepoStub) GetByCandidatePair(_ context.Context, _, _ string) (*messaging.Conversation, error) {
	return nil, nil
}
func (s *conversationRepoStub) ListByCandidate(_ context.Context, _ string, _, _ int) ([]*messaging.ConversationWithPreview, int, error) {
	return nil, 0, nil
}
func (s *conversationRepoStub) ListByCompany(_ context.Context, _ string, _, _ int) ([]*messaging.ConversationWithPreview, int, error) {
	return nil, 0, nil
}
func (s *conversationRepoStub) UpdateLastMessageAt(ctx context.Context, id string) error {
	if s.updateLastMessageAtFn != nil {
		return s.updateLastMessageAtFn(ctx, id)
	}
	return nil
}
func (s *conversationRepoStub) CountUnreadByCandidate(_ context.Context, _ string) (int, error) {
	return 0, nil
}
func (s *conversationRepoStub) CountUnreadByCompany(_ context.Context, _ string) (int, error) {
	return 0, nil
}

type messageRepoStub struct {
	createFn func(ctx context.Context, msg *messaging.Message) (*messaging.Message, error)
}

func (s *messageRepoStub) Create(ctx context.Context, msg *messaging.Message) (*messaging.Message, error) {
	if s.createFn != nil {
		return s.createFn(ctx, msg)
	}
	return msg, nil
}
func (s *messageRepoStub) ListByConversationID(_ context.Context, _ string, _, _ int) ([]*messaging.Message, int, error) {
	return nil, 0, nil
}

type participantRepoStub struct {
	createFn func(ctx context.Context, p *messaging.ConversationParticipant) error
}

func (s *participantRepoStub) Create(ctx context.Context, p *messaging.ConversationParticipant) error {
	if s.createFn != nil {
		return s.createFn(ctx, p)
	}
	return nil
}
func (s *participantRepoStub) GetByConversationAndParticipant(_ context.Context, _, _, _ string) (*messaging.ConversationParticipant, error) {
	return nil, nil
}
func (s *participantRepoStub) UpdateLastReadAt(_ context.Context, _, _, _ string) error {
	return nil
}
func (s *participantRepoStub) ListByConversation(_ context.Context, _ string) ([]*messaging.ConversationParticipant, error) {
	return nil, nil
}

type interviewQueryStub struct {
	applicationCandidateIDFn       func(ctx context.Context, applicationID, companyID string) (string, error)
	markApplicationInterviewingFn  func(ctx context.Context, applicationID string) error
	candidateNameAndAvatarFn       func(ctx context.Context, userID string) (string, string, error)
	companyNameFn                  func(ctx context.Context, companyID string) (string, error)
	jobTitleByApplicationFn        func(ctx context.Context, applicationID string) (string, error)
	pendingProposalByApplicationFn func(ctx context.Context, applicationID string) (*interview.PendingProposal, error)
}

func (s *interviewQueryStub) ApplicationCandidateID(ctx context.Context, applicationID, companyID string) (string, error) {
	return s.applicationCandidateIDFn(ctx, applicationID, companyID)
}
func (s *interviewQueryStub) MarkApplicationInterviewing(ctx context.Context, applicationID string) error {
	if s.markApplicationInterviewingFn != nil {
		return s.markApplicationInterviewingFn(ctx, applicationID)
	}
	return nil
}
func (s *interviewQueryStub) CandidateNameAndAvatar(ctx context.Context, userID string) (string, string, error) {
	if s.candidateNameAndAvatarFn != nil {
		return s.candidateNameAndAvatarFn(ctx, userID)
	}
	return "", "", nil
}
func (s *interviewQueryStub) CompanyName(ctx context.Context, companyID string) (string, error) {
	if s.companyNameFn != nil {
		return s.companyNameFn(ctx, companyID)
	}
	return "", nil
}
func (s *interviewQueryStub) JobTitleByApplication(ctx context.Context, applicationID string) (string, error) {
	if s.jobTitleByApplicationFn != nil {
		return s.jobTitleByApplicationFn(ctx, applicationID)
	}
	return "", nil
}
func (s *interviewQueryStub) PendingProposalByApplication(ctx context.Context, applicationID string) (*interview.PendingProposal, error) {
	if s.pendingProposalByApplicationFn != nil {
		return s.pendingProposalByApplicationFn(ctx, applicationID)
	}
	return nil, nil
}

// Unused placeholders to avoid "imported and not used" warnings if a test file
// grows to reference a subset; imports are needed for the stub signatures.
var (
	_ = education.ErrSchoolRequired
)
