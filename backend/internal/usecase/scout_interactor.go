package usecase

import (
	"context"
	"strings"
	"time"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/notification"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ScoutInteractor struct {
	msgRepo      port.ScoutMessageRepository
	creditRepo   port.ScoutCreditRepository
	ledgerRepo   port.ScoutCreditLedgerRepository
	replyRepo    port.ScoutReplyRepository
	settingsRepo port.UserScoutSettingsRepository
	notifRepo    port.NotificationRepository
	userRepo     port.UserRepository
	tx           port.TxManager
	output       port.ScoutOutputPort
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
	tx port.TxManager,
	output port.ScoutOutputPort,
) *ScoutInteractor {
	return &ScoutInteractor{
		msgRepo:      msgRepo,
		creditRepo:   creditRepo,
		ledgerRepo:   ledgerRepo,
		replyRepo:    replyRepo,
		settingsRepo: settingsRepo,
		notifRepo:    notifRepo,
		userRepo:     userRepo,
		tx:           tx,
		output:       output,
	}
}

func (i *ScoutInteractor) Send(ctx context.Context, input scout.SendScoutInput) error {
	input.Subject = strings.TrimSpace(input.Subject)
	input.Body = strings.TrimSpace(input.Body)
	if err := scout.ValidateSend(input); err != nil {
		return err
	}

	settings, err := i.settingsRepo.GetByUserID(ctx, input.CandidateID)
	if err != nil && !isNotFound(err) {
		return err
	}
	if settings != nil && !settings.AcceptingScouts {
		return scout.ErrScoutingDisabled
	}

	credit, err := i.creditRepo.GetOrCreate(ctx, input.CompanyID)
	if err != nil {
		return err
	}
	if credit.QualityRestricted {
		return scout.ErrQualityRestricted
	}

	qResult, err := i.evaluateQuality(ctx, input.CompanyID, credit)
	if err != nil {
		return err
	}
	if err := i.applyQualityTransitions(ctx, input.CompanyID, qResult); err != nil {
		return err
	}
	if qResult.Score.Level == scout.QualityRestricted || qResult.Score.Level == scout.QualityTemporarilyRestricted {
		return scout.ErrQualityRestricted
	}

	active, err := i.msgRepo.GetActiveByCompanyAndCandidate(ctx, input.CompanyID, input.CandidateID)
	if err != nil && !isNotFound(err) {
		return err
	}
	if active != nil {
		return scout.ErrDuplicateScout
	}

	var resendCount int16
	latest, err := i.msgRepo.GetLatestByCompanyAndCandidate(ctx, input.CompanyID, input.CandidateID)
	if err != nil && !isNotFound(err) {
		return err
	}
	if latest != nil {
		if err := scout.CanResend(latest); err != nil {
			return err
		}
		resendCount = latest.ResendCount + 1
	}

	candidate, err := i.userRepo.GetByID(ctx, input.CandidateID)
	if err != nil {
		return err
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
		return err
	}

	msg, err := i.msgRepo.GetByID(ctx, created.ID)
	if err != nil {
		return err
	}
	return i.output.PresentScoutMessage(ctx, msg)
}

func (i *ScoutInteractor) ListByCompany(ctx context.Context, companyID string, status *string, limit, offset int) error {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	msgs, total, err := i.msgRepo.ListByCompanyID(ctx, companyID, status, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentScoutMessages(ctx, msgs, total)
}

func (i *ScoutInteractor) GetDetail(ctx context.Context, companyID, scoutID string) error {
	msg, err := i.msgRepo.GetByID(ctx, scoutID)
	if err != nil {
		return err
	}
	if msg.CompanyID != companyID {
		return scout.ErrNotOwner
	}
	replies, err := i.replyRepo.ListByScoutMessageID(ctx, scoutID)
	if err != nil {
		return err
	}
	return i.output.PresentScoutDetail(ctx, msg, replies)
}

func (i *ScoutInteractor) GetCredits(ctx context.Context, companyID string) error {
	credit, err := i.creditRepo.GetOrCreate(ctx, companyID)
	if err != nil {
		return err
	}
	return i.output.PresentCredits(ctx, credit)
}

func (i *ScoutInteractor) GetQualityScore(ctx context.Context, companyID string) error {
	credit, err := i.creditRepo.GetOrCreate(ctx, companyID)
	if err != nil {
		return err
	}
	qResult, err := i.evaluateQuality(ctx, companyID, credit)
	if err != nil {
		return err
	}
	if err := i.applyQualityTransitions(ctx, companyID, qResult); err != nil {
		return err
	}
	return i.output.PresentQualityScore(ctx, &qResult.Score)
}

func (i *ScoutInteractor) evaluateQuality(ctx context.Context, companyID string, credit *scout.ScoutCredit) (scout.QualityResult, error) {
	now := time.Now()

	sent14, err := i.msgRepo.CountSentLastNDays(ctx, companyID, scout.DefaultLookbackDays)
	if err != nil {
		return scout.QualityResult{}, err
	}
	replied14, err := i.msgRepo.CountRepliedLastNDays(ctx, companyID, scout.DefaultLookbackDays)
	if err != nil {
		return scout.QualityResult{}, err
	}

	var sent20, replied20 int
	if credit.WarningStartedAt != nil {
		deadline := credit.WarningStartedAt.Add(scout.WarningImprovementDays * 24 * time.Hour)
		if !now.Before(deadline) {
			sent20, err = i.msgRepo.CountSentLastNDays(ctx, companyID, scout.WarningExtendedLookback)
			if err != nil {
				return scout.QualityResult{}, err
			}
			replied20, err = i.msgRepo.CountRepliedLastNDays(ctx, companyID, scout.WarningExtendedLookback)
			if err != nil {
				return scout.QualityResult{}, err
			}
		}
	}

	return scout.EvaluateQuality(scout.QualityInput{
		Sent14d:              sent14,
		Replied14d:           replied14,
		Sent20d:              sent20,
		Replied20d:           replied20,
		WarningStartedAt:     credit.WarningStartedAt,
		RestrictionStartedAt: credit.RestrictionStartedAt,
		QualityRestricted:    credit.QualityRestricted,
		Now:                  now,
	}), nil
}

func (i *ScoutInteractor) applyQualityTransitions(ctx context.Context, companyID string, result scout.QualityResult) error {
	if result.ShouldSetWarning {
		return i.creditRepo.SetQualityWarning(ctx, companyID)
	}
	if result.ShouldClearWarning {
		return i.creditRepo.ClearQualityWarning(ctx, companyID)
	}
	if result.ShouldTempRestrict {
		return i.creditRepo.SetTemporaryRestriction(ctx, companyID)
	}
	if result.ShouldClearRestriction {
		return i.creditRepo.ClearTemporaryRestriction(ctx, companyID)
	}
	if result.ShouldRestrict {
		return i.creditRepo.SetQualityRestricted(ctx, companyID)
	}
	return nil
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

	return i.output.PresentOK(ctx)
}

func (i *ScoutInteractor) ListByCandidate(ctx context.Context, candidateID string, limit, offset int) error {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	msgs, total, err := i.msgRepo.ListByCandidateID(ctx, candidateID, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentScoutMessages(ctx, msgs, total)
}

func (i *ScoutInteractor) GetReceivedDetail(ctx context.Context, candidateID, scoutID string) error {
	msg, err := i.msgRepo.GetByID(ctx, scoutID)
	if err != nil {
		return err
	}
	if msg.CandidateID != candidateID {
		return scout.ErrNotOwner
	}

	if msg.Status == scout.StatusSent {
		_ = i.msgRepo.MarkOpened(ctx, scoutID)
		msg.Status = scout.StatusOpened
	}

	replies, err := i.replyRepo.ListByScoutMessageID(ctx, scoutID)
	if err != nil {
		return err
	}
	return i.output.PresentReceivedDetail(ctx, msg, replies)
}

func (i *ScoutInteractor) Respond(ctx context.Context, candidateID, scoutID string, response scout.CandidateResponse) error {
	msg, err := i.msgRepo.GetByID(ctx, scoutID)
	if err != nil {
		return err
	}
	if msg.CandidateID != candidateID {
		return scout.ErrNotOwner
	}
	if msg.Status != scout.StatusSent && msg.Status != scout.StatusOpened {
		return scout.ErrNotSentOrOpened
	}

	newStatus := scout.Status(response)

	err = i.tx.WithinTransaction(ctx, func(ctx context.Context) error {
		if err := i.msgRepo.UpdateStatus(ctx, scoutID, newStatus); err != nil {
			return err
		}

		credit, err := i.creditRepo.Refund(ctx, msg.CompanyID)
		if err != nil {
			return err
		}
		if err := i.ledgerRepo.Create(ctx, &scout.CreditLedgerEntry{
			CompanyID:      msg.CompanyID,
			Delta:          1,
			Reason:         "response_refund",
			ScoutMessageID: &scoutID,
			BalanceAfter:   credit.Balance,
		}); err != nil {
			return err
		}

		notifType := notification.TypeScoutInterested
		notifTitle := "スカウトに「興味あり」の回答がありました"
		if response == scout.ResponseDeclined {
			notifType = notification.TypeScoutDeclined
			notifTitle = "スカウトが辞退されました"
		}
		companyID := msg.CompanyID
		_, err = i.notifRepo.Create(ctx, &notification.Notification{
			CompanyID:   &companyID,
			Type:        notifType,
			Title:       notifTitle,
			ReferenceID: &scoutID,
		})
		return err
	})
	if err != nil {
		return err
	}
	return i.output.PresentOK(ctx)
}

func (i *ScoutInteractor) CandidateReply(ctx context.Context, candidateID, scoutID, body string) error {
	body = strings.TrimSpace(body)
	if err := scout.ValidateReply(body); err != nil {
		return err
	}

	msg, err := i.msgRepo.GetByID(ctx, scoutID)
	if err != nil {
		return err
	}
	if msg.CandidateID != candidateID {
		return scout.ErrNotOwner
	}

	isFirstReply := msg.Status == scout.StatusSent || msg.Status == scout.StatusOpened

	err = i.tx.WithinTransaction(ctx, func(ctx context.Context) error {
		if isFirstReply {
			if err := i.msgRepo.MarkReplied(ctx, scoutID); err != nil {
				return err
			}

			credit, err := i.creditRepo.Refund(ctx, msg.CompanyID)
			if err != nil {
				return err
			}
			if err := i.ledgerRepo.Create(ctx, &scout.CreditLedgerEntry{
				CompanyID:      msg.CompanyID,
				Delta:          1,
				Reason:         "reply_refund",
				ScoutMessageID: &scoutID,
				BalanceAfter:   credit.Balance,
			}); err != nil {
				return err
			}
		}

		_, err := i.replyRepo.Create(ctx, &scout.ScoutReply{
			ScoutMessageID: scoutID,
			SenderType:     "candidate",
			SenderID:       candidateID,
			Body:           body,
		})
		if err != nil {
			return err
		}

		companyID := msg.CompanyID
		_, err = i.notifRepo.Create(ctx, &notification.Notification{
			CompanyID:   &companyID,
			Type:        notification.TypeScoutReplied,
			Title:       "スカウトに返信がありました",
			ReferenceID: &scoutID,
		})
		return err
	})
	if err != nil {
		return err
	}
	return i.output.PresentOK(ctx)
}

func (i *ScoutInteractor) BulkDecline(ctx context.Context, candidateID string, scoutIDs []string) error {
	for _, id := range scoutIDs {
		msg, err := i.msgRepo.GetByID(ctx, id)
		if err != nil {
			return err
		}
		if msg.CandidateID != candidateID {
			return scout.ErrNotOwner
		}
		if msg.Status != scout.StatusSent && msg.Status != scout.StatusOpened {
			continue
		}
		err = i.tx.WithinTransaction(ctx, func(ctx context.Context) error {
			if err := i.msgRepo.UpdateStatus(ctx, id, scout.StatusDeclined); err != nil {
				return err
			}
			credit, err := i.creditRepo.Refund(ctx, msg.CompanyID)
			if err != nil {
				return err
			}
			return i.ledgerRepo.Create(ctx, &scout.CreditLedgerEntry{
				CompanyID:      msg.CompanyID,
				Delta:          1,
				Reason:         "decline_refund",
				ScoutMessageID: &id,
				BalanceAfter:   credit.Balance,
			})
		})
		if err != nil {
			return err
		}
	}
	return i.output.PresentOK(ctx)
}

func (i *ScoutInteractor) UpdateScoutSettings(ctx context.Context, userID string, accepting bool) error {
	s, err := i.settingsRepo.Upsert(ctx, &scout.UserScoutSettings{
		UserID:          userID,
		AcceptingScouts: accepting,
	})
	if err != nil {
		return err
	}
	return i.output.PresentScoutSettings(ctx, s)
}

func (i *ScoutInteractor) GetScoutSettings(ctx context.Context, userID string) error {
	s, err := i.settingsRepo.GetByUserID(ctx, userID)
	if err != nil {
		if isNotFound(err) {
			return i.output.PresentScoutSettings(ctx, &scout.UserScoutSettings{
				UserID:          userID,
				AcceptingScouts: true,
			})
		}
		return err
	}
	return i.output.PresentScoutSettings(ctx, s)
}

func (i *ScoutInteractor) GetDashboard(ctx context.Context, companyID string) error {
	credit, err := i.creditRepo.GetOrCreate(ctx, companyID)
	if err != nil {
		return err
	}

	dbPending, err := i.msgRepo.CountPendingByMonth(ctx, companyID)
	if err != nil {
		return err
	}
	countByMonth := make(map[string]int)
	for _, p := range dbPending {
		key := p.SentMonth.Format("2006-01")
		countByMonth[key] = p.Count
	}

	now := time.Now()
	pendingByMonth := make([]scout.PendingByMonth, 0, 4)
	pendingTotal := 0
	for offset := 3; offset >= 0; offset-- {
		m := time.Date(now.Year(), now.Month()-time.Month(offset), 1, 0, 0, 0, 0, now.Location())
		expiresAt := scout.CalcExpiresAt(m)
		if expiresAt.Before(now) {
			continue
		}
		key := m.Format("2006-01")
		count := countByMonth[key]
		pendingTotal += count
		pendingByMonth = append(pendingByMonth, scout.PendingByMonth{
			SentMonth: m,
			Count:     count,
			ExpiresAt: expiresAt,
		})
	}

	sent90, err := i.msgRepo.CountSentLastNDays(ctx, companyID, 90)
	if err != nil {
		return err
	}
	replied90, err := i.msgRepo.CountRepliedLastNDays(ctx, companyID, 90)
	if err != nil {
		return err
	}
	var replyRate float64
	if sent90 > 0 {
		replyRate = float64(replied90) / float64(sent90) * 100.0
	}

	avgReplyDays, err := i.msgRepo.AvgReplyDays(ctx, companyID)
	if err != nil {
		return err
	}

	return i.output.PresentDashboard(ctx, &scout.DashboardStats{
		Credits:        credit,
		PendingTotal:   pendingTotal,
		PendingByMonth: pendingByMonth,
		ReplyRate:      replyRate,
		AvgReplyDays:   avgReplyDays,
		SentLast90d:    sent90,
	})
}

func isNotFound(err error) bool {
	return err != nil && err.Error() == domainerr.ErrNotFound.Error()
}
