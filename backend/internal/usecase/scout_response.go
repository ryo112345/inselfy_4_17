package usecase

import (
	"context"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/domain/notification"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
)

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

	if err := i.processResponse(ctx, msg, scoutID, response); err != nil {
		return err
	}
	return nil
}

func (i *ScoutInteractor) processResponse(ctx context.Context, msg *scout.ScoutMessageWithNames, scoutID string, response scout.CandidateResponse) error {
	newStatus := scout.Status(response)

	return i.tx.WithinTransaction(ctx, func(ctx context.Context) error {
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
		if _, err := i.notifRepo.Create(ctx, &notification.Notification{
			CompanyID:   &companyID,
			Type:        notifType,
			Title:       notifTitle,
			ReferenceID: &scoutID,
		}); err != nil {
			return err
		}

		if err := i.createConversationFromScout(ctx, msg, response); err != nil {
			return err
		}

		return nil
	})
}

func (i *ScoutInteractor) createConversationFromScout(ctx context.Context, msg *scout.ScoutMessageWithNames, response scout.CandidateResponse) error {
	existing, err := i.convRepo.GetByCompanyAndCandidate(ctx, msg.CompanyID, msg.CandidateID)
	if err != nil && !isNotFound(err) {
		return err
	}

	var convID string
	if existing != nil {
		convID = existing.ID
	} else {
		conv, err := i.convRepo.Create(ctx, &messaging.Conversation{
			CompanyID:   msg.CompanyID,
			CandidateID: msg.CandidateID,
		})
		if err != nil {
			return err
		}
		convID = conv.ID

		if err := i.participantRepo.Create(ctx, &messaging.ConversationParticipant{
			ConversationID:  convID,
			ParticipantType: "company",
			ParticipantID:   msg.CompanyID,
		}); err != nil {
			return err
		}
		if err := i.participantRepo.Create(ctx, &messaging.ConversationParticipant{
			ConversationID:  convID,
			ParticipantType: "candidate",
			ParticipantID:   msg.CandidateID,
		}); err != nil {
			return err
		}
	}

	if _, err := i.convMsgRepo.Create(ctx, &messaging.Message{
		ConversationID: convID,
		SenderType:     "company",
		SenderID:       msg.CompanyID,
		Body:           msg.Subject + "\n\n" + msg.Body,
	}); err != nil {
		return err
	}

	systemBody := "興味ありと回答しました"
	if response == scout.ResponseDeclined {
		systemBody = "辞退されました"
	}
	if _, err := i.convMsgRepo.Create(ctx, &messaging.Message{
		ConversationID: convID,
		SenderType:     "system",
		SenderID:       msg.CandidateID,
		Body:           systemBody,
	}); err != nil {
		return err
	}

	if err := i.convRepo.UpdateLastMessageAt(ctx, convID); err != nil {
		return err
	}

	return nil
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
	return nil
}

func (i *ScoutInteractor) BulkDecline(ctx context.Context, candidateID string, scoutIDs []string) error {
	return i.BulkRespond(ctx, candidateID, scoutIDs, scout.ResponseDeclined)
}

func (i *ScoutInteractor) BulkRespond(ctx context.Context, candidateID string, scoutIDs []string, response scout.CandidateResponse) error {
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
		if err := i.processResponse(ctx, msg, id, response); err != nil {
			return err
		}
	}
	return nil
}
