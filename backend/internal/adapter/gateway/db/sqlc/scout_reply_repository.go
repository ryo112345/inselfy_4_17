package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ScoutReplyRepository struct {
	queries *generated.Queries
}

var _ port.ScoutReplyRepository = (*ScoutReplyRepository)(nil)

func NewScoutReplyRepository(pool *pgxpool.Pool) *ScoutReplyRepository {
	return &ScoutReplyRepository{queries: generated.New(pool)}
}

func (r *ScoutReplyRepository) Create(ctx context.Context, reply *scout.ScoutReply) (*scout.ScoutReply, error) {
	q := queriesForContext(ctx, r.queries)
	msgID, err := parseUUID(reply.ScoutMessageID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	senderID, err := parseUUID(reply.SenderID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateScoutReply(ctx, &generated.CreateScoutReplyParams{
		ScoutMessageID: msgID,
		SenderType:     reply.SenderType,
		SenderID:       senderID,
		Body:           reply.Body,
	})
	if err != nil {
		return nil, err
	}
	return scoutReplyToDomain(row), nil
}

func (r *ScoutReplyRepository) ListByScoutMessageID(ctx context.Context, scoutMessageID string) ([]*scout.ScoutReply, error) {
	q := queriesForContext(ctx, r.queries)
	pgMsgID, err := parseUUID(scoutMessageID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListScoutRepliesByMessageID(ctx, pgMsgID)
	if err != nil {
		return nil, err
	}
	replies := make([]*scout.ScoutReply, len(rows))
	for i, row := range rows {
		replies[i] = scoutReplyToDomain(row)
	}
	return replies, nil
}

func scoutReplyToDomain(row *generated.ScoutReply) *scout.ScoutReply {
	return &scout.ScoutReply{
		ID:             uuidToString(row.ID),
		ScoutMessageID: uuidToString(row.ScoutMessageID),
		SenderType:     row.SenderType,
		SenderID:       uuidToString(row.SenderID),
		Body:           row.Body,
		CreatedAt:      row.CreatedAt.Time,
	}
}
