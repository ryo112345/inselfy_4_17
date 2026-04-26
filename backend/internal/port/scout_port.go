package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
)

type ScoutInputPort interface {
	Send(ctx context.Context, input scout.SendScoutInput) error
	ListByCompany(ctx context.Context, companyID string, status *string, limit, offset int) error
	GetDetail(ctx context.Context, companyID, scoutID string) error
	GetCredits(ctx context.Context, companyID string) error
	GetQualityScore(ctx context.Context, companyID string) error
	CompanyReply(ctx context.Context, companyID, scoutID, body string) error

	ListByCandidate(ctx context.Context, candidateID string, limit, offset int) error
	GetReceivedDetail(ctx context.Context, candidateID, scoutID string) error
	Respond(ctx context.Context, candidateID, scoutID string, response scout.CandidateResponse) error
	CandidateReply(ctx context.Context, candidateID, scoutID, body string) error
	BulkDecline(ctx context.Context, candidateID string, scoutIDs []string) error

	UpdateScoutSettings(ctx context.Context, userID string, accepting bool) error
	GetScoutSettings(ctx context.Context, userID string) error
}

type ScoutOutputPort interface {
	PresentScoutMessage(ctx context.Context, m *scout.ScoutMessageWithNames) error
	PresentScoutMessages(ctx context.Context, msgs []*scout.ScoutMessageWithNames, total int) error
	PresentScoutDetail(ctx context.Context, m *scout.ScoutMessageWithNames, replies []*scout.ScoutReply) error
	PresentCredits(ctx context.Context, c *scout.ScoutCredit) error
	PresentQualityScore(ctx context.Context, q *scout.QualityScore) error
	PresentScoutSettings(ctx context.Context, s *scout.UserScoutSettings) error
	PresentReceivedDetail(ctx context.Context, m *scout.ScoutMessageWithNames, replies []*scout.ScoutReply) error
	PresentOK(ctx context.Context) error
}

type ScoutMessageRepository interface {
	Create(ctx context.Context, m *scout.ScoutMessage) (*scout.ScoutMessage, error)
	GetByID(ctx context.Context, id string) (*scout.ScoutMessageWithNames, error)
	ListByCompanyID(ctx context.Context, companyID string, status *string, limit, offset int) ([]*scout.ScoutMessageWithNames, int, error)
	ListByCandidateID(ctx context.Context, candidateID string, limit, offset int) ([]*scout.ScoutMessageWithNames, int, error)
	UpdateStatus(ctx context.Context, id string, status scout.Status) error
	MarkOpened(ctx context.Context, id string) error
	MarkReplied(ctx context.Context, id string) error
	GetActiveByCompanyAndCandidate(ctx context.Context, companyID, candidateID string) (*scout.ScoutMessage, error)
	GetLatestByCompanyAndCandidate(ctx context.Context, companyID, candidateID string) (*scout.ScoutMessage, error)
	CountSentLast14Days(ctx context.Context, companyID string) (int, error)
	CountRepliedLast14Days(ctx context.Context, companyID string) (int, error)
	ExpireOverdue(ctx context.Context) (int64, error)
}

type ScoutCreditRepository interface {
	GetOrCreate(ctx context.Context, companyID string) (*scout.ScoutCredit, error)
	Deduct(ctx context.Context, companyID string) (*scout.ScoutCredit, error)
	Refund(ctx context.Context, companyID string) (*scout.ScoutCredit, error)
}

type ScoutCreditLedgerRepository interface {
	Create(ctx context.Context, entry *scout.CreditLedgerEntry) error
}

type ScoutReplyRepository interface {
	Create(ctx context.Context, r *scout.ScoutReply) (*scout.ScoutReply, error)
	ListByScoutMessageID(ctx context.Context, scoutMessageID string) ([]*scout.ScoutReply, error)
}

type UserScoutSettingsRepository interface {
	GetByUserID(ctx context.Context, userID string) (*scout.UserScoutSettings, error)
	Upsert(ctx context.Context, s *scout.UserScoutSettings) (*scout.UserScoutSettings, error)
}

// TalentSearchInputPort provides candidate search capabilities for companies.
type TalentSearchInputPort interface {
	Search(ctx context.Context, companyID string, keyword *string, skills []string, limit, offset int) error
	GetProfile(ctx context.Context, userID string) error
}

// TalentSearchOutputPort renders search results.
type TalentSearchOutputPort interface {
	PresentCandidates(ctx context.Context, users []*user.User, total int) error
	PresentCandidateProfile(ctx context.Context, u *user.User) error
}
