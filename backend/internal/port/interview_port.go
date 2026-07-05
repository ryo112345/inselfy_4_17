package port

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/interview"
)

type InterviewInputPort interface {
	Propose(ctx context.Context, input interview.ProposeInput) (*interview.Proposal, error)
	SelectSlot(ctx context.Context, input interview.SelectSlotInput) (*interview.Interview, error)
	ListByCompany(ctx context.Context, companyID string, from, to time.Time) ([]*interview.InterviewWithNames, []*interview.Proposal, error)
	ListByCandidate(ctx context.Context, candidateID string) ([]*interview.InterviewWithNames, []*interview.Proposal, error)
	CancelInterview(ctx context.Context, interviewID, actorID, actorType string) error
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
