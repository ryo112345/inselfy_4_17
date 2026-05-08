package usecase

import (
	"context"
	"strings"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type MessagingInteractor struct {
	convRepo        port.ConversationRepository
	msgRepo         port.MessageRepository
	participantRepo port.ConversationParticipantRepository
	tx              port.TxManager
	output          port.MessagingOutputPort
}

var _ port.MessagingInputPort = (*MessagingInteractor)(nil)

func NewMessagingInteractor(
	convRepo port.ConversationRepository,
	msgRepo port.MessageRepository,
	participantRepo port.ConversationParticipantRepository,
	tx port.TxManager,
	output port.MessagingOutputPort,
) *MessagingInteractor {
	return &MessagingInteractor{
		convRepo:        convRepo,
		msgRepo:         msgRepo,
		participantRepo: participantRepo,
		tx:              tx,
		output:          output,
	}
}

func (i *MessagingInteractor) StartConversation(ctx context.Context, input messaging.StartConversationInput) error {
	input.Body = strings.TrimSpace(input.Body)
	if err := messaging.ValidateMessageBody(input.Body); err != nil {
		return err
	}

	existing, err := i.convRepo.GetByCompanyAndCandidate(ctx, input.CompanyID, input.CandidateID)
	if err != nil && !isNotFound(err) {
		return err
	}
	if existing != nil {
		return messaging.ErrConversationExists
	}

	var conv *messaging.Conversation
	err = i.tx.WithinTransaction(ctx, func(txCtx context.Context) error {
		var txErr error
		conv, txErr = i.convRepo.Create(txCtx, &messaging.Conversation{
			CompanyID:   input.CompanyID,
			CandidateID: input.CandidateID,
		})
		if txErr != nil {
			return txErr
		}

		txErr = i.participantRepo.Create(txCtx, &messaging.ConversationParticipant{
			ConversationID:  conv.ID,
			ParticipantType: "company",
			ParticipantID:   input.CompanyID,
		})
		if txErr != nil {
			return txErr
		}

		txErr = i.participantRepo.Create(txCtx, &messaging.ConversationParticipant{
			ConversationID:  conv.ID,
			ParticipantType: "candidate",
			ParticipantID:   input.CandidateID,
		})
		if txErr != nil {
			return txErr
		}

		_, txErr = i.msgRepo.Create(txCtx, &messaging.Message{
			ConversationID: conv.ID,
			SenderType:     input.SenderType,
			SenderID:       input.SenderID,
			Body:           input.Body,
		})
		return txErr
	})
	if err != nil {
		return err
	}

	result, err := i.convRepo.GetByID(ctx, conv.ID)
	if err != nil {
		return err
	}
	return i.output.PresentConversation(ctx, result)
}

func (i *MessagingInteractor) StartCandidateConversation(ctx context.Context, input messaging.StartCandidateConversationInput) error {
	input.Body = strings.TrimSpace(input.Body)
	if err := messaging.ValidateMessageBody(input.Body); err != nil {
		return err
	}
	if input.SenderID == input.RecipientID {
		return messaging.ErrSelfConversation
	}

	p1, p2 := input.SenderID, input.RecipientID
	if p1 > p2 {
		p1, p2 = p2, p1
	}

	existing, err := i.convRepo.GetByCandidatePair(ctx, p1, p2)
	if err != nil && !isNotFound(err) {
		return err
	}
	if existing != nil {
		result, err := i.convRepo.GetByID(ctx, existing.ID)
		if err != nil {
			return err
		}
		return i.output.PresentConversation(ctx, result)
	}

	var conv *messaging.Conversation
	err = i.tx.WithinTransaction(ctx, func(txCtx context.Context) error {
		var txErr error
		conv, txErr = i.convRepo.CreateCandidateConversation(txCtx, &messaging.Conversation{
			Participant1ID: p1,
			Participant2ID: p2,
		})
		if txErr != nil {
			return txErr
		}

		txErr = i.participantRepo.Create(txCtx, &messaging.ConversationParticipant{
			ConversationID:  conv.ID,
			ParticipantType: "candidate",
			ParticipantID:   input.SenderID,
		})
		if txErr != nil {
			return txErr
		}

		txErr = i.participantRepo.Create(txCtx, &messaging.ConversationParticipant{
			ConversationID:  conv.ID,
			ParticipantType: "candidate",
			ParticipantID:   input.RecipientID,
		})
		if txErr != nil {
			return txErr
		}

		_, txErr = i.msgRepo.Create(txCtx, &messaging.Message{
			ConversationID: conv.ID,
			SenderType:     "candidate",
			SenderID:       input.SenderID,
			Body:           input.Body,
		})
		return txErr
	})
	if err != nil {
		return err
	}

	result, err := i.convRepo.GetByID(ctx, conv.ID)
	if err != nil {
		return err
	}
	return i.output.PresentConversation(ctx, result)
}

func (i *MessagingInteractor) SendMessage(ctx context.Context, input messaging.SendMessageInput) error {
	input.Body = strings.TrimSpace(input.Body)
	if err := messaging.ValidateMessageBody(input.Body); err != nil {
		return err
	}

	_, err := i.participantRepo.GetByConversationAndParticipant(ctx, input.ConversationID, input.SenderType, input.SenderID)
	if err != nil {
		if isNotFound(err) {
			return messaging.ErrNotParticipant
		}
		return err
	}

	msg, err := i.msgRepo.Create(ctx, &messaging.Message{
		ConversationID: input.ConversationID,
		SenderType:     input.SenderType,
		SenderID:       input.SenderID,
		Body:           input.Body,
		MessageType:    input.MessageType,
		Metadata:       input.Metadata,
	})
	if err != nil {
		return err
	}

	if err := i.convRepo.UpdateLastMessageAt(ctx, input.ConversationID); err != nil {
		return err
	}

	return i.output.PresentMessage(ctx, msg)
}

func (i *MessagingInteractor) ListConversationsByCandidate(ctx context.Context, candidateID string, limit, offset int) error {
	convs, total, err := i.convRepo.ListByCandidate(ctx, candidateID, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentConversations(ctx, convs, total)
}

func (i *MessagingInteractor) ListConversationsByCompany(ctx context.Context, companyID string, limit, offset int) error {
	convs, total, err := i.convRepo.ListByCompany(ctx, companyID, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentConversations(ctx, convs, total)
}

func (i *MessagingInteractor) GetConversation(ctx context.Context, conversationID, participantType, participantID string) error {
	_, err := i.participantRepo.GetByConversationAndParticipant(ctx, conversationID, participantType, participantID)
	if err != nil {
		if isNotFound(err) {
			return messaging.ErrNotParticipant
		}
		return err
	}

	conv, err := i.convRepo.GetByID(ctx, conversationID)
	if err != nil {
		return err
	}

	return i.output.PresentConversation(ctx, conv)
}

func (i *MessagingInteractor) ListMessages(ctx context.Context, conversationID, participantType, participantID string, limit, offset int) error {
	_, err := i.participantRepo.GetByConversationAndParticipant(ctx, conversationID, participantType, participantID)
	if err != nil {
		if isNotFound(err) {
			return messaging.ErrNotParticipant
		}
		return err
	}

	msgs, total, err := i.msgRepo.ListByConversationID(ctx, conversationID, limit, offset)
	if err != nil {
		return err
	}

	_ = i.participantRepo.UpdateLastReadAt(ctx, conversationID, participantType, participantID)

	return i.output.PresentMessages(ctx, msgs, total)
}

func (i *MessagingInteractor) MarkRead(ctx context.Context, conversationID, participantType, participantID string) error {
	_, err := i.participantRepo.GetByConversationAndParticipant(ctx, conversationID, participantType, participantID)
	if err != nil {
		if isNotFound(err) {
			return messaging.ErrNotParticipant
		}
		return err
	}

	if err := i.participantRepo.UpdateLastReadAt(ctx, conversationID, participantType, participantID); err != nil {
		return err
	}
	return i.output.PresentOK(ctx)
}

func (i *MessagingInteractor) CountUnreadByCandidate(ctx context.Context, candidateID string) error {
	count, err := i.convRepo.CountUnreadByCandidate(ctx, candidateID)
	if err != nil {
		if isNotFound(err) {
			return i.output.PresentUnreadCount(ctx, 0)
		}
		return err
	}
	return i.output.PresentUnreadCount(ctx, count)
}

func (i *MessagingInteractor) CountUnreadByCompany(ctx context.Context, companyID string) error {
	count, err := i.convRepo.CountUnreadByCompany(ctx, companyID)
	if err != nil {
		if isNotFound(err) {
			return i.output.PresentUnreadCount(ctx, 0)
		}
		return err
	}
	return i.output.PresentUnreadCount(ctx, count)
}

func (i *MessagingInteractor) findConversationForParticipant(ctx context.Context, conversationID, participantType, participantID string) error {
	_, err := i.participantRepo.GetByConversationAndParticipant(ctx, conversationID, participantType, participantID)
	if err != nil {
		if isNotFound(err) {
			return domainerr.ErrNotFound
		}
		return err
	}
	return nil
}
