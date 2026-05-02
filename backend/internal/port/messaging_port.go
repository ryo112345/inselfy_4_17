package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
)

type MessagingInputPort interface {
	StartConversation(ctx context.Context, input messaging.StartConversationInput) error
	SendMessage(ctx context.Context, input messaging.SendMessageInput) error
	ListConversationsByCandidate(ctx context.Context, candidateID string, limit, offset int) error
	ListConversationsByCompany(ctx context.Context, companyID string, limit, offset int) error
	GetConversation(ctx context.Context, conversationID, participantType, participantID string) error
	ListMessages(ctx context.Context, conversationID, participantType, participantID string, limit, offset int) error
	MarkRead(ctx context.Context, conversationID, participantType, participantID string) error
	CountUnreadByCandidate(ctx context.Context, candidateID string) error
	CountUnreadByCompany(ctx context.Context, companyID string) error
}

type MessagingOutputPort interface {
	PresentConversation(ctx context.Context, conv *messaging.ConversationWithPreview) error
	PresentConversations(ctx context.Context, convs []*messaging.ConversationWithPreview, total int) error
	PresentMessage(ctx context.Context, msg *messaging.Message) error
	PresentMessages(ctx context.Context, msgs []*messaging.Message, total int) error
	PresentUnreadCount(ctx context.Context, count int) error
	PresentOK(ctx context.Context) error
}

type ConversationRepository interface {
	Create(ctx context.Context, conv *messaging.Conversation) (*messaging.Conversation, error)
	GetByID(ctx context.Context, id string) (*messaging.ConversationWithPreview, error)
	GetByCompanyAndCandidate(ctx context.Context, companyID, candidateID string) (*messaging.Conversation, error)
	ListByCandidate(ctx context.Context, candidateID string, limit, offset int) ([]*messaging.ConversationWithPreview, int, error)
	ListByCompany(ctx context.Context, companyID string, limit, offset int) ([]*messaging.ConversationWithPreview, int, error)
	UpdateLastMessageAt(ctx context.Context, id string) error
	CountUnreadByCandidate(ctx context.Context, candidateID string) (int, error)
	CountUnreadByCompany(ctx context.Context, companyID string) (int, error)
}

type MessageRepository interface {
	Create(ctx context.Context, msg *messaging.Message) (*messaging.Message, error)
	ListByConversationID(ctx context.Context, conversationID string, limit, offset int) ([]*messaging.Message, int, error)
}

type ConversationParticipantRepository interface {
	Create(ctx context.Context, p *messaging.ConversationParticipant) error
	GetByConversationAndParticipant(ctx context.Context, conversationID, participantType, participantID string) (*messaging.ConversationParticipant, error)
	UpdateLastReadAt(ctx context.Context, conversationID, participantType, participantID string) error
}

type MessageBroker interface {
	Publish(ctx context.Context, channel string, payload []byte) error
	Subscribe(ctx context.Context, channel string) (<-chan []byte, func(), error)
}
