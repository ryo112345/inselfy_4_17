package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type MessageRepository struct {
	queries *generated.Queries
}

var _ port.MessageRepository = (*MessageRepository)(nil)

func NewMessageRepository(pool *pgxpool.Pool) *MessageRepository {
	return &MessageRepository{queries: generated.New(pool)}
}

func (r *MessageRepository) Create(ctx context.Context, msg *messaging.Message) (*messaging.Message, error) {
	q := queriesForContext(ctx, r.queries)
	convID, err := parseUUID(msg.ConversationID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	senderID, err := parseUUID(msg.SenderID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateMessage(ctx, &generated.CreateMessageParams{
		ConversationID: convID,
		SenderType:     msg.SenderType,
		SenderID:       senderID,
		Body:           msg.Body,
	})
	if err != nil {
		return nil, err
	}
	return messageToDomain(row), nil
}

func (r *MessageRepository) ListByConversationID(ctx context.Context, conversationID string, limit, offset int) ([]*messaging.Message, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgConvID, err := parseUUID(conversationID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	rows, err := q.ListMessagesByConversationID(ctx, &generated.ListMessagesByConversationIDParams{
		ConversationID: pgConvID,
		Limit:          int32(limit),
		Offset:         int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountMessagesByConversationID(ctx, pgConvID)
	if err != nil {
		return nil, 0, err
	}
	msgs := make([]*messaging.Message, len(rows))
	for i, row := range rows {
		msgs[i] = messageToDomain(row)
	}
	return msgs, int(count), nil
}

func messageToDomain(row *generated.Message) *messaging.Message {
	return &messaging.Message{
		ID:             uuidToString(row.ID),
		ConversationID: uuidToString(row.ConversationID),
		SenderType:     row.SenderType,
		SenderID:       uuidToString(row.SenderID),
		Body:           row.Body,
		CreatedAt:      row.CreatedAt.Time,
	}
}
