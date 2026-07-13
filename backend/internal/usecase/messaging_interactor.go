package usecase

import (
	"context"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type MessagingInteractor struct {
	convRepo        port.ConversationRepository
	msgRepo         port.MessageRepository
	participantRepo port.ConversationParticipantRepository
	tx              port.TxManager
}

var _ port.MessagingInputPort = (*MessagingInteractor)(nil)

func NewMessagingInteractor(
	convRepo port.ConversationRepository,
	msgRepo port.MessageRepository,
	participantRepo port.ConversationParticipantRepository,
	tx port.TxManager,
) *MessagingInteractor {
	return &MessagingInteractor{
		convRepo:        convRepo,
		msgRepo:         msgRepo,
		participantRepo: participantRepo,
		tx:              tx,
	}
}

func (i *MessagingInteractor) StartConversation(ctx context.Context, input messaging.StartConversationInput) (*messaging.ConversationWithPreview, error) {
	input.Body = strings.TrimSpace(input.Body)
	if err := messaging.ValidateMessageBody(input.Body); err != nil {
		return nil, err
	}

	existing, err := i.convRepo.GetByCompanyAndCandidate(ctx, input.CompanyID, input.CandidateID)
	if err != nil && !isNotFound(err) {
		return nil, err
	}
	if existing != nil {
		return nil, messaging.ErrConversationExists
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
		return nil, err
	}

	result, err := i.convRepo.GetByID(ctx, conv.ID)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (i *MessagingInteractor) StartCandidateConversation(ctx context.Context, input messaging.StartCandidateConversationInput) (*messaging.ConversationWithPreview, error) {
	input.Body = strings.TrimSpace(input.Body)
	if err := messaging.ValidateMessageBody(input.Body); err != nil {
		return nil, err
	}
	if input.SenderID == input.RecipientID {
		return nil, messaging.ErrSelfConversation
	}

	p1, p2 := input.SenderID, input.RecipientID
	if p1 > p2 {
		p1, p2 = p2, p1
	}

	existing, err := i.convRepo.GetByCandidatePair(ctx, p1, p2)
	if err != nil && !isNotFound(err) {
		return nil, err
	}
	if existing != nil {
		result, err := i.convRepo.GetByID(ctx, existing.ID)
		if err != nil {
			return nil, err
		}
		return result, nil
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
		return nil, err
	}

	result, err := i.convRepo.GetByID(ctx, conv.ID)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (i *MessagingInteractor) SendMessage(ctx context.Context, input messaging.SendMessageInput) (*messaging.Message, error) {
	input.Body = strings.TrimSpace(input.Body)
	if err := messaging.ValidateMessageBody(input.Body); err != nil {
		return nil, err
	}

	_, err := i.participantRepo.GetByConversationAndParticipant(ctx, input.ConversationID, input.SenderType, input.SenderID)
	if err != nil {
		if isNotFound(err) {
			return nil, messaging.ErrNotParticipant
		}
		return nil, err
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
		return nil, err
	}

	if err := i.convRepo.UpdateLastMessageAt(ctx, input.ConversationID); err != nil {
		return nil, err
	}

	return msg, nil
}

func (i *MessagingInteractor) ListConversationsByCandidate(ctx context.Context, candidateID string, limit, offset int) ([]*messaging.ConversationWithPreview, int, error) {
	convs, total, err := i.convRepo.ListByCandidate(ctx, candidateID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	return convs, total, nil
}

func (i *MessagingInteractor) ListConversationsByCompany(ctx context.Context, companyID string, limit, offset int) ([]*messaging.ConversationWithPreview, int, error) {
	convs, total, err := i.convRepo.ListByCompany(ctx, companyID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	return convs, total, nil
}

func (i *MessagingInteractor) GetConversation(ctx context.Context, conversationID, participantType, participantID string) (*messaging.ConversationWithPreview, error) {
	_, err := i.participantRepo.GetByConversationAndParticipant(ctx, conversationID, participantType, participantID)
	if err != nil {
		if isNotFound(err) {
			return nil, messaging.ErrNotParticipant
		}
		return nil, err
	}

	conv, err := i.convRepo.GetByID(ctx, conversationID)
	if err != nil {
		return nil, err
	}

	return conv, nil
}

func (i *MessagingInteractor) ListMessages(ctx context.Context, conversationID, participantType, participantID string, limit, offset int) ([]*messaging.Message, int, error) {
	_, err := i.participantRepo.GetByConversationAndParticipant(ctx, conversationID, participantType, participantID)
	if err != nil {
		if isNotFound(err) {
			return nil, 0, messaging.ErrNotParticipant
		}
		return nil, 0, err
	}

	msgs, total, err := i.msgRepo.ListByConversationID(ctx, conversationID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	_ = i.participantRepo.UpdateLastReadAt(ctx, conversationID, participantType, participantID)

	return msgs, total, nil
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
	return nil
}

func (i *MessagingInteractor) CountUnreadByCandidate(ctx context.Context, candidateID string) (int, error) {
	count, err := i.convRepo.CountUnreadByCandidate(ctx, candidateID)
	if err != nil {
		if isNotFound(err) {
			return 0, nil
		}
		return 0, err
	}
	return count, nil
}

func (i *MessagingInteractor) CountUnreadByCompany(ctx context.Context, companyID string) (int, error) {
	count, err := i.convRepo.CountUnreadByCompany(ctx, companyID)
	if err != nil {
		if isNotFound(err) {
			return 0, nil
		}
		return 0, err
	}
	return count, nil
}
