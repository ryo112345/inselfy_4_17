package usecase

// The scout usecase is split by responsibility across sibling files:
//   - scout_interactor.go: sending and company/candidate views
//   - scout_quality.go:    quality scoring and state transitions
//   - scout_response.go:   candidate responses, replies, conversation creation
//   - scout_settings.go:   scout settings and company dashboard

import (
	"context"
	"strings"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/notification"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ScoutInteractor struct {
	msgRepo         port.ScoutMessageRepository
	creditRepo      port.ScoutCreditRepository
	ledgerRepo      port.ScoutCreditLedgerRepository
	replyRepo       port.ScoutReplyRepository
	settingsRepo    port.UserScoutSettingsRepository
	notifRepo       port.NotificationRepository
	userRepo        port.UserRepository
	convRepo        port.ConversationRepository
	convMsgRepo     port.MessageRepository
	participantRepo port.ConversationParticipantRepository
	tx              port.TxManager
}

var _ port.ScoutInputPort = (*ScoutInteractor)(nil)

func NewScoutInteractor(
	msgRepo port.ScoutMessageRepository,
	creditRepo port.ScoutCreditRepository,
	ledgerRepo port.ScoutCreditLedgerRepository,
	replyRepo port.ScoutReplyRepository,
	settingsRepo port.UserScoutSettingsRepository,
	notifRepo port.NotificationRepository,
	userRepo port.UserRepository,
	convRepo port.ConversationRepository,
	convMsgRepo port.MessageRepository,
	participantRepo port.ConversationParticipantRepository,
	tx port.TxManager,
) *ScoutInteractor {
	return &ScoutInteractor{
		msgRepo:         msgRepo,
		creditRepo:      creditRepo,
		ledgerRepo:      ledgerRepo,
		replyRepo:       replyRepo,
		settingsRepo:    settingsRepo,
		notifRepo:       notifRepo,
		userRepo:        userRepo,
		convRepo:        convRepo,
		convMsgRepo:     convMsgRepo,
		participantRepo: participantRepo,
		tx:              tx,
	}
}

func (i *ScoutInteractor) Send(ctx context.Context, input scout.SendScoutInput) (*scout.ScoutMessageWithNames, error) {
	normalizeStrings(&input.Subject, &input.Body)
	if err := scout.ValidateSend(input); err != nil {
		return nil, err
	}

	settings, err := i.settingsRepo.GetByUserID(ctx, input.CandidateID)
	if err != nil && !isNotFound(err) {
		return nil, err
	}
	if settings != nil && !settings.AcceptingScouts {
		return nil, scout.ErrScoutingDisabled
	}

	credit, err := i.creditRepo.GetOrCreate(ctx, input.CompanyID)
	if err != nil {
		return nil, err
	}
	if credit.QualityRestricted {
		return nil, scout.ErrQualityRestricted
	}

	qResult, err := i.evaluateQuality(ctx, input.CompanyID, credit)
	if err != nil {
		return nil, err
	}
	if err := i.applyQualityTransitions(ctx, input.CompanyID, qResult); err != nil {
		return nil, err
	}
	if qResult.Score.Level == scout.QualityRestricted || qResult.Score.Level == scout.QualityTemporarilyRestricted {
		return nil, scout.ErrQualityRestricted
	}

	active, err := i.msgRepo.GetActiveByCompanyAndCandidate(ctx, input.CompanyID, input.CandidateID)
	if err != nil && !isNotFound(err) {
		return nil, err
	}
	if active != nil {
		return nil, scout.ErrDuplicateScout
	}

	var resendCount int16
	latest, err := i.msgRepo.GetLatestByCompanyAndCandidate(ctx, input.CompanyID, input.CandidateID)
	if err != nil && !isNotFound(err) {
		return nil, err
	}
	if latest != nil {
		if err := scout.CanResend(latest); err != nil {
			return nil, err
		}
		resendCount = latest.ResendCount + 1
	}

	candidate, err := i.userRepo.GetByID(ctx, input.CandidateID)
	if err != nil {
		return nil, err
	}
	vars := map[string]string{
		"candidate_name": candidate.Name,
	}
	input.Body = scout.RenderTemplate(input.Body, vars)

	now := time.Now()
	expiresAt := scout.CalcExpiresAt(now)

	var created *scout.ScoutMessage
	err = i.tx.WithinTransaction(ctx, func(ctx context.Context) error {
		credit, err := i.creditRepo.Deduct(ctx, input.CompanyID)
		if err != nil {
			if isNotFound(err) {
				return scout.ErrInsufficientCredits
			}
			return err
		}
		if credit == nil {
			return scout.ErrInsufficientCredits
		}

		created, err = i.msgRepo.Create(ctx, &scout.ScoutMessage{
			CompanyID:    input.CompanyID,
			CandidateID:  input.CandidateID,
			JobPostingID: input.JobPostingID,
			TemplateID:   input.TemplateID,
			Subject:      input.Subject,
			Body:         input.Body,
			Status:       scout.StatusSent,
			SentAt:       &now,
			ExpiresAt:    &expiresAt,
			ResendCount:  resendCount,
		})
		if err != nil {
			return err
		}

		if err := i.ledgerRepo.Create(ctx, &scout.CreditLedgerEntry{
			CompanyID:      input.CompanyID,
			Delta:          -1,
			Reason:         "send",
			ScoutMessageID: &created.ID,
			BalanceAfter:   credit.Balance,
		}); err != nil {
			return err
		}

		_, err = i.notifRepo.Create(ctx, &notification.Notification{
			UserID:      &input.CandidateID,
			Type:        notification.TypeScoutReceived,
			Title:       "新しいスカウトが届きました",
			Body:        input.Subject,
			ReferenceID: &created.ID,
		})
		return err
	})
	if err != nil {
		return nil, err
	}

	msg, err := i.msgRepo.GetByID(ctx, created.ID)
	if err != nil {
		return nil, err
	}
	return msg, nil
}

func (i *ScoutInteractor) ListByCompany(ctx context.Context, companyID string, status *string, limit, offset int) ([]*scout.ScoutMessageWithNames, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	msgs, total, err := i.msgRepo.ListByCompanyID(ctx, companyID, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	return msgs, total, nil
}

func (i *ScoutInteractor) GetDetail(ctx context.Context, companyID, scoutID string) (*scout.ScoutMessageWithNames, []*scout.ScoutReply, error) {
	msg, err := i.msgRepo.GetByID(ctx, scoutID)
	if err != nil {
		return nil, nil, err
	}
	if msg.CompanyID != companyID {
		return nil, nil, scout.ErrNotOwner
	}
	replies, err := i.replyRepo.ListByScoutMessageID(ctx, scoutID)
	if err != nil {
		return nil, nil, err
	}
	return msg, replies, nil
}

func (i *ScoutInteractor) GetCredits(ctx context.Context, companyID string) (*scout.ScoutCredit, error) {
	credit, err := i.creditRepo.GetOrCreate(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return credit, nil
}

func (i *ScoutInteractor) CompanyReply(ctx context.Context, companyID, scoutID, body string) error {
	body = strings.TrimSpace(body)
	if err := scout.ValidateReply(body); err != nil {
		return err
	}

	msg, err := i.msgRepo.GetByID(ctx, scoutID)
	if err != nil {
		return err
	}
	if msg.CompanyID != companyID {
		return scout.ErrNotOwner
	}

	_, err = i.replyRepo.Create(ctx, &scout.ScoutReply{
		ScoutMessageID: scoutID,
		SenderType:     "company",
		SenderID:       companyID,
		Body:           body,
	})
	if err != nil {
		return err
	}

	candidateID := msg.CandidateID
	_, _ = i.notifRepo.Create(ctx, &notification.Notification{
		UserID:      &candidateID,
		Type:        notification.TypeScoutReplied,
		Title:       "スカウトに返信がありました",
		ReferenceID: &scoutID,
	})

	return nil
}

func (i *ScoutInteractor) CountUnreadByCandidate(ctx context.Context, candidateID string) (int, error) {
	return i.msgRepo.CountUnreadByCandidateID(ctx, candidateID)
}

func (i *ScoutInteractor) ListByCandidate(ctx context.Context, candidateID string, limit, offset int) ([]*scout.ScoutMessageWithNames, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	msgs, total, err := i.msgRepo.ListByCandidateID(ctx, candidateID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	return msgs, total, nil
}

func (i *ScoutInteractor) GetReceivedDetail(ctx context.Context, candidateID, scoutID string) (*scout.ScoutMessageWithNames, []*scout.ScoutReply, error) {
	msg, err := i.msgRepo.GetByID(ctx, scoutID)
	if err != nil {
		return nil, nil, err
	}
	if msg.CandidateID != candidateID {
		return nil, nil, scout.ErrNotOwner
	}

	if msg.Status == scout.StatusSent {
		_ = i.msgRepo.MarkOpened(ctx, scoutID)
		msg.Status = scout.StatusOpened
	}

	replies, err := i.replyRepo.ListByScoutMessageID(ctx, scoutID)
	if err != nil {
		return nil, nil, err
	}
	return msg, replies, nil
}
