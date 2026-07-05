package port

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/interview"
)

type InterviewInputPort interface {
	Propose(ctx context.Context, input interview.ProposeInput) (*interview.ProposeOutput, error)
	SelectSlot(ctx context.Context, input interview.SelectSlotInput) (*interview.Interview, error)
	ListByCompany(ctx context.Context, companyID string, from, to time.Time) ([]*interview.InterviewWithNames, error)
	ListByCandidate(ctx context.Context, candidateID string) ([]*interview.InterviewWithNames, []*interview.ProposalWithDetails, error)
	// CancelInterview accepts both company and candidate actors; whichever ID is
	// non-empty is checked against the interview's owner.
	CancelInterview(ctx context.Context, interviewID, companyID, userID string) error
	GetPendingProposal(ctx context.Context, applicationID string) (*interview.PendingProposal, error)
	GetProposalSlots(ctx context.Context, proposalID string) (*interview.Proposal, []*interview.Slot, error)
}

// InterviewQueryService covers the composite reads the interview flow needs
// outside the entity repositories (display-name enrichment and
// job_applications lookups/updates).
type InterviewQueryService interface {
	// ApplicationCandidateID returns the candidate of an application scoped to
	// the owning company (doubles as the ownership check).
	ApplicationCandidateID(ctx context.Context, applicationID, companyID string) (string, error)
	// MarkApplicationInterviewing moves an applied/screening application to
	// status 'interview' (no-op for other statuses).
	MarkApplicationInterviewing(ctx context.Context, applicationID string) error
	CandidateNameAndAvatar(ctx context.Context, userID string) (name, avatarURL string, err error)
	CompanyName(ctx context.Context, companyID string) (string, error)
	JobTitleByApplication(ctx context.Context, applicationID string) (string, error)
	PendingProposalByApplication(ctx context.Context, applicationID string) (*interview.PendingProposal, error)
}

type InterviewProposalRepository interface {
	Create(ctx context.Context, p *interview.Proposal) (*interview.Proposal, error)
	GetByID(ctx context.Context, id string) (*interview.Proposal, error)
	UpdateStatus(ctx context.Context, id, status string) error
	UpdateMessageID(ctx context.Context, id, messageID string) error
	ListPendingByCandidate(ctx context.Context, candidateID string) ([]*interview.Proposal, error)
	CancelPendingByApplication(ctx context.Context, applicationID string) ([]*interview.Proposal, error)
}

type InterviewSlotRepository interface {
	Create(ctx context.Context, s *interview.Slot) (*interview.Slot, error)
	GetByID(ctx context.Context, id string) (*interview.Slot, error)
	ListByProposal(ctx context.Context, proposalID string) ([]*interview.Slot, error)
	UpdateStatus(ctx context.Context, id, status string) error
	RejectOthers(ctx context.Context, proposalID, selectedID string) error
}

type InterviewRepository interface {
	Create(ctx context.Context, iv *interview.Interview) (*interview.Interview, error)
	GetByID(ctx context.Context, id string) (*interview.Interview, error)
	ListByCompany(ctx context.Context, companyID string, from, to time.Time) ([]*interview.Interview, error)
	ListByCandidate(ctx context.Context, candidateID string) ([]*interview.Interview, error)
	UpdateStatus(ctx context.Context, id, status string) error
}
