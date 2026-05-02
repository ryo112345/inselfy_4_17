package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ConversationParticipantRepository struct {
	queries *generated.Queries
}

var _ port.ConversationParticipantRepository = (*ConversationParticipantRepository)(nil)

func NewConversationParticipantRepository(pool *pgxpool.Pool) *ConversationParticipantRepository {
	return &ConversationParticipantRepository{queries: generated.New(pool)}
}

func (r *ConversationParticipantRepository) Create(ctx context.Context, p *messaging.ConversationParticipant) error {
	q := queriesForContext(ctx, r.queries)
	convID, err := parseUUID(p.ConversationID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	participantID, err := parseUUID(p.ParticipantID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.CreateConversationParticipant(ctx, &generated.CreateConversationParticipantParams{
		ConversationID:  convID,
		ParticipantType: p.ParticipantType,
		ParticipantID:   participantID,
	})
}

func (r *ConversationParticipantRepository) GetByConversationAndParticipant(ctx context.Context, conversationID, participantType, participantID string) (*messaging.ConversationParticipant, error) {
	q := queriesForContext(ctx, r.queries)
	pgConvID, err := parseUUID(conversationID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	pgParticipantID, err := parseUUID(participantID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetConversationParticipant(ctx, &generated.GetConversationParticipantParams{
		ConversationID:  pgConvID,
		ParticipantType: participantType,
		ParticipantID:   pgParticipantID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return &messaging.ConversationParticipant{
		ID:              uuidToString(row.ID),
		ConversationID:  uuidToString(row.ConversationID),
		ParticipantType: row.ParticipantType,
		ParticipantID:   uuidToString(row.ParticipantID),
		LastReadAt:      row.LastReadAt.Time,
	}, nil
}

func (r *ConversationParticipantRepository) UpdateLastReadAt(ctx context.Context, conversationID, participantType, participantID string) error {
	q := queriesForContext(ctx, r.queries)
	pgConvID, err := parseUUID(conversationID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	pgParticipantID, err := parseUUID(participantID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.UpdateParticipantLastReadAt(ctx, &generated.UpdateParticipantLastReadAtParams{
		ConversationID:  pgConvID,
		ParticipantType: participantType,
		ParticipantID:   pgParticipantID,
	})
}
