package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ConversationRepository struct {
	queries *generated.Queries
}

var _ port.ConversationRepository = (*ConversationRepository)(nil)

func NewConversationRepository(pool *pgxpool.Pool) *ConversationRepository {
	return &ConversationRepository{queries: generated.New(pool)}
}

func (r *ConversationRepository) Create(ctx context.Context, conv *messaging.Conversation) (*messaging.Conversation, error) {
	q := queriesForContext(ctx, r.queries)
	companyID, err := parseUUID(conv.CompanyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	candidateID, err := parseUUID(conv.CandidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateConversation(ctx, &generated.CreateConversationParams{
		CompanyID:   companyID,
		CandidateID: candidateID,
	})
	if err != nil {
		return nil, err
	}
	return conversationToDomain(row), nil
}

func (r *ConversationRepository) CreateCandidateConversation(ctx context.Context, conv *messaging.Conversation) (*messaging.Conversation, error) {
	q := queriesForContext(ctx, r.queries)
	p1, err := parseUUID(conv.Participant1ID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	p2, err := parseUUID(conv.Participant2ID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateCandidateConversation(ctx, &generated.CreateCandidateConversationParams{
		Participant1ID: p1,
		Participant2ID: p2,
	})
	if err != nil {
		return nil, err
	}
	return conversationToDomain(row), nil
}

func (r *ConversationRepository) GetByID(ctx context.Context, id string) (*messaging.ConversationWithPreview, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.GetConversationByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return &messaging.ConversationWithPreview{
		Conversation: messaging.Conversation{
			ID:               uuidToString(row.ID),
			ConversationType: row.ConversationType,
			CompanyID:        uuidToString(row.CompanyID),
			CandidateID:      uuidToString(row.CandidateID),
			Participant1ID:   uuidToString(row.Participant1ID),
			Participant2ID:   uuidToString(row.Participant2ID),
			LastMessageAt:    row.LastMessageAt.Time,
			CreatedAt:        row.CreatedAt.Time,
		},
		CompanyName:      row.CompanyName,
		CandidateName:    row.CandidateName,
		Participant1Name: row.Participant1Name,
		Participant2Name: row.Participant2Name,
	}, nil
}

func (r *ConversationRepository) GetByCompanyAndCandidate(ctx context.Context, companyID, candidateID string) (*messaging.Conversation, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	pgCandidateID, err := parseUUID(candidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetConversationByCompanyAndCandidate(ctx, &generated.GetConversationByCompanyAndCandidateParams{
		CompanyID:   pgCompanyID,
		CandidateID: pgCandidateID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return conversationToDomain(row), nil
}

func (r *ConversationRepository) GetByCandidatePair(ctx context.Context, userID1, userID2 string) (*messaging.Conversation, error) {
	q := queriesForContext(ctx, r.queries)
	p1, err := parseUUID(userID1)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	p2, err := parseUUID(userID2)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetConversationByCandidatePair(ctx, &generated.GetConversationByCandidatePairParams{
		Participant1ID: p1,
		Participant2ID: p2,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return conversationToDomain(row), nil
}

func (r *ConversationRepository) ListByCandidate(ctx context.Context, candidateID string, limit, offset int) ([]*messaging.ConversationWithPreview, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgCandidateID, err := parseUUID(candidateID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	rows, err := q.ListConversationsByCandidate(ctx, &generated.ListConversationsByCandidateParams{
		UserID:    pgCandidateID,
		RowLimit:  cast.Int32(limit),
		RowOffset: cast.Int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountConversationsByCandidate(ctx, pgCandidateID)
	if err != nil {
		return nil, 0, err
	}
	convs := make([]*messaging.ConversationWithPreview, len(rows))
	for i, row := range rows {
		convs[i] = candidateConvRowToDomain(row)
	}
	return convs, int(count), nil
}

func (r *ConversationRepository) ListByCompany(ctx context.Context, companyID string, limit, offset int) ([]*messaging.ConversationWithPreview, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	rows, err := q.ListConversationsByCompany(ctx, &generated.ListConversationsByCompanyParams{
		CompanyID: pgCompanyID,
		Limit:     cast.Int32(limit),
		Offset:    cast.Int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountConversationsByCompany(ctx, pgCompanyID)
	if err != nil {
		return nil, 0, err
	}
	convs := make([]*messaging.ConversationWithPreview, len(rows))
	for i, row := range rows {
		convs[i] = companyConvRowToDomain(row)
	}
	return convs, int(count), nil
}

func (r *ConversationRepository) UpdateLastMessageAt(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.UpdateConversationLastMessageAt(ctx, pgID)
}

func (r *ConversationRepository) CountUnreadByCandidate(ctx context.Context, candidateID string) (int, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(candidateID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	count, err := q.CountUnreadConversationsByCandidate(ctx, pgID)
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *ConversationRepository) CountUnreadByCompany(ctx context.Context, companyID string) (int, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(companyID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	count, err := q.CountUnreadConversationsByCompany(ctx, pgID)
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func conversationToDomain(row *generated.Conversation) *messaging.Conversation {
	return &messaging.Conversation{
		ID:               uuidToString(row.ID),
		ConversationType: row.ConversationType,
		CompanyID:        uuidToString(row.CompanyID),
		CandidateID:      uuidToString(row.CandidateID),
		Participant1ID:   uuidToString(row.Participant1ID),
		Participant2ID:   uuidToString(row.Participant2ID),
		LastMessageAt:    row.LastMessageAt.Time,
		CreatedAt:        row.CreatedAt.Time,
	}
}

func candidateConvRowToDomain(row *generated.ListConversationsByCandidateRow) *messaging.ConversationWithPreview {
	var body *string
	if row.LastMessageBody != "" {
		body = &row.LastMessageBody
	}
	return &messaging.ConversationWithPreview{
		Conversation: messaging.Conversation{
			ID:               uuidToString(row.ID),
			ConversationType: row.ConversationType,
			CompanyID:        uuidToString(row.CompanyID),
			CandidateID:      uuidToString(row.CandidateID),
			Participant1ID:   uuidToString(row.Participant1ID),
			Participant2ID:   uuidToString(row.Participant2ID),
			LastMessageAt:    row.LastMessageAt.Time,
			CreatedAt:        row.CreatedAt.Time,
		},
		CompanyName:      row.CompanyName,
		CandidateName:    row.CandidateName,
		Participant1Name: row.Participant1Name,
		Participant2Name: row.Participant2Name,
		LastMessageBody:  body,
		UnreadCount:      int(row.UnreadCount),
	}
}

func companyConvRowToDomain(row *generated.ListConversationsByCompanyRow) *messaging.ConversationWithPreview {
	var body *string
	if row.LastMessageBody != "" {
		body = &row.LastMessageBody
	}
	return &messaging.ConversationWithPreview{
		Conversation: messaging.Conversation{
			ID:               uuidToString(row.ID),
			ConversationType: row.ConversationType,
			CompanyID:        uuidToString(row.CompanyID),
			CandidateID:      uuidToString(row.CandidateID),
			Participant1ID:   uuidToString(row.Participant1ID),
			Participant2ID:   uuidToString(row.Participant2ID),
			LastMessageAt:    row.LastMessageAt.Time,
			CreatedAt:        row.CreatedAt.Time,
		},
		CompanyName:      row.CompanyName,
		CandidateName:    row.CandidateName,
		Participant1Name: row.Participant1Name,
		Participant2Name: row.Participant2Name,
		LastMessageBody:  body,
		UnreadCount:      int(row.UnreadCount),
	}
}
