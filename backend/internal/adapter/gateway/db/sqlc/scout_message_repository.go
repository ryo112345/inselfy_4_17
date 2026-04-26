package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ScoutMessageRepository struct {
	queries *generated.Queries
}

var _ port.ScoutMessageRepository = (*ScoutMessageRepository)(nil)

func NewScoutMessageRepository(pool *pgxpool.Pool) *ScoutMessageRepository {
	return &ScoutMessageRepository{queries: generated.New(pool)}
}

func (r *ScoutMessageRepository) Create(ctx context.Context, m *scout.ScoutMessage) (*scout.ScoutMessage, error) {
	q := queriesForContext(ctx, r.queries)
	companyID, err := parseUUID(m.CompanyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	candidateID, err := parseUUID(m.CandidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateScoutMessage(ctx, &generated.CreateScoutMessageParams{
		CompanyID:    companyID,
		CandidateID:  candidateID,
		JobPostingID: optionalUUID(m.JobPostingID),
		TemplateID:   optionalUUID(m.TemplateID),
		Subject:      m.Subject,
		Body:         m.Body,
		Status:       generated.ScoutMessageStatus(m.Status),
		SentAt:       timePtrToTimestamptz(m.SentAt),
		ExpiresAt:    timePtrToTimestamptz(m.ExpiresAt),
		ResendCount:  m.ResendCount,
	})
	if err != nil {
		return nil, err
	}
	return scoutMessageToDomain(row), nil
}

func (r *ScoutMessageRepository) GetByID(ctx context.Context, id string) (*scout.ScoutMessageWithNames, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.GetScoutMessageByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return scoutMessageWithNamesToDomain(row), nil
}

func (r *ScoutMessageRepository) ListByCompanyID(ctx context.Context, companyID string, status *string, limit, offset int) ([]*scout.ScoutMessageWithNames, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	var statusFilter generated.NullScoutMessageStatus
	if status != nil {
		statusFilter = generated.NullScoutMessageStatus{
			ScoutMessageStatus: generated.ScoutMessageStatus(*status),
			Valid:              true,
		}
	}
	rows, err := q.ListScoutMessagesByCompanyID(ctx, &generated.ListScoutMessagesByCompanyIDParams{
		CompanyID: pgCompanyID,
		Status:    statusFilter,
		LimitVal:  int32(limit),
		OffsetVal: int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountScoutMessagesByCompanyID(ctx, &generated.CountScoutMessagesByCompanyIDParams{
		CompanyID: pgCompanyID,
		Status:    statusFilter,
	})
	if err != nil {
		return nil, 0, err
	}
	msgs := make([]*scout.ScoutMessageWithNames, len(rows))
	for i, row := range rows {
		msgs[i] = companyRowToDomain(row)
	}
	return msgs, int(count), nil
}

func (r *ScoutMessageRepository) ListByCandidateID(ctx context.Context, candidateID string, limit, offset int) ([]*scout.ScoutMessageWithNames, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgCandidateID, err := parseUUID(candidateID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	rows, err := q.ListScoutMessagesByCandidateID(ctx, &generated.ListScoutMessagesByCandidateIDParams{
		CandidateID: pgCandidateID,
		Limit:       int32(limit),
		Offset:      int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountScoutMessagesByCandidateID(ctx, pgCandidateID)
	if err != nil {
		return nil, 0, err
	}
	msgs := make([]*scout.ScoutMessageWithNames, len(rows))
	for i, row := range rows {
		msgs[i] = candidateRowToDomain(row)
	}
	return msgs, int(count), nil
}

func (r *ScoutMessageRepository) UpdateStatus(ctx context.Context, id string, status scout.Status) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.UpdateScoutMessageStatus(ctx, &generated.UpdateScoutMessageStatusParams{
		ID:     pgID,
		Status: generated.ScoutMessageStatus(status),
	})
}

func (r *ScoutMessageRepository) MarkOpened(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.MarkScoutMessageOpened(ctx, pgID)
}

func (r *ScoutMessageRepository) MarkReplied(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.MarkScoutMessageReplied(ctx, pgID)
}

func (r *ScoutMessageRepository) GetActiveByCompanyAndCandidate(ctx context.Context, companyID, candidateID string) (*scout.ScoutMessage, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	pgCandidateID, err := parseUUID(candidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetActiveScoutByCompanyAndCandidate(ctx, &generated.GetActiveScoutByCompanyAndCandidateParams{
		CompanyID:   pgCompanyID,
		CandidateID: pgCandidateID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return scoutMessageToDomain(row), nil
}

func (r *ScoutMessageRepository) GetLatestByCompanyAndCandidate(ctx context.Context, companyID, candidateID string) (*scout.ScoutMessage, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	pgCandidateID, err := parseUUID(candidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetLatestScoutByCompanyAndCandidate(ctx, &generated.GetLatestScoutByCompanyAndCandidateParams{
		CompanyID:   pgCompanyID,
		CandidateID: pgCandidateID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return scoutMessageToDomain(row), nil
}

func (r *ScoutMessageRepository) CountSentLast14Days(ctx context.Context, companyID string) (int, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	count, err := q.CountScoutsSentLast14Days(ctx, pgCompanyID)
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *ScoutMessageRepository) CountRepliedLast14Days(ctx context.Context, companyID string) (int, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	count, err := q.CountScoutsRepliedLast14Days(ctx, pgCompanyID)
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *ScoutMessageRepository) CountSentLastNDays(ctx context.Context, companyID string, days int) (int, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	count, err := q.CountScoutsSentLastNDays(ctx, &generated.CountScoutsSentLastNDaysParams{
		CompanyID: pgCompanyID,
		Days:      int32(days),
	})
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *ScoutMessageRepository) CountRepliedLastNDays(ctx context.Context, companyID string, days int) (int, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	count, err := q.CountScoutsRepliedLastNDays(ctx, &generated.CountScoutsRepliedLastNDaysParams{
		CompanyID: pgCompanyID,
		Days:      int32(days),
	})
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *ScoutMessageRepository) ExpireOverdue(ctx context.Context) (int64, error) {
	q := queriesForContext(ctx, r.queries)
	return q.ExpireOverdueScoutMessages(ctx)
}

// --- conversion helpers ---

func scoutMessageToDomain(row *generated.ScoutMessage) *scout.ScoutMessage {
	return &scout.ScoutMessage{
		ID:           uuidToString(row.ID),
		CompanyID:    uuidToString(row.CompanyID),
		CandidateID:  uuidToString(row.CandidateID),
		JobPostingID: uuidPtr(row.JobPostingID),
		TemplateID:   uuidPtr(row.TemplateID),
		Subject:      row.Subject,
		Body:         row.Body,
		Status:       scout.Status(row.Status),
		SentAt:       timestamptzToTimePtr(row.SentAt),
		OpenedAt:     timestamptzToTimePtr(row.OpenedAt),
		RepliedAt:    timestamptzToTimePtr(row.RepliedAt),
		ExpiresAt:    timestamptzToTimePtr(row.ExpiresAt),
		ResendCount:  row.ResendCount,
		CreatedAt:    row.CreatedAt.Time,
		UpdatedAt:    row.UpdatedAt.Time,
	}
}

func scoutMessageWithNamesToDomain(row *generated.GetScoutMessageByIDRow) *scout.ScoutMessageWithNames {
	return &scout.ScoutMessageWithNames{
		ScoutMessage: scout.ScoutMessage{
			ID:           uuidToString(row.ID),
			CompanyID:    uuidToString(row.CompanyID),
			CandidateID:  uuidToString(row.CandidateID),
			JobPostingID: uuidPtr(row.JobPostingID),
			TemplateID:   uuidPtr(row.TemplateID),
			Subject:      row.Subject,
			Body:         row.Body,
			Status:       scout.Status(row.Status),
			SentAt:       timestamptzToTimePtr(row.SentAt),
			OpenedAt:     timestamptzToTimePtr(row.OpenedAt),
			RepliedAt:    timestamptzToTimePtr(row.RepliedAt),
			ExpiresAt:    timestamptzToTimePtr(row.ExpiresAt),
			ResendCount:  row.ResendCount,
			CreatedAt:    row.CreatedAt.Time,
			UpdatedAt:    row.UpdatedAt.Time,
		},
		CompanyName:   row.CompanyName,
		CandidateName: row.CandidateName,
		JobTitle:      textPtr(row.JobTitle),
	}
}

func companyRowToDomain(row *generated.ListScoutMessagesByCompanyIDRow) *scout.ScoutMessageWithNames {
	return &scout.ScoutMessageWithNames{
		ScoutMessage: scout.ScoutMessage{
			ID:           uuidToString(row.ID),
			CompanyID:    uuidToString(row.CompanyID),
			CandidateID:  uuidToString(row.CandidateID),
			JobPostingID: uuidPtr(row.JobPostingID),
			TemplateID:   uuidPtr(row.TemplateID),
			Subject:      row.Subject,
			Body:         row.Body,
			Status:       scout.Status(row.Status),
			SentAt:       timestamptzToTimePtr(row.SentAt),
			OpenedAt:     timestamptzToTimePtr(row.OpenedAt),
			RepliedAt:    timestamptzToTimePtr(row.RepliedAt),
			ExpiresAt:    timestamptzToTimePtr(row.ExpiresAt),
			ResendCount:  row.ResendCount,
			CreatedAt:    row.CreatedAt.Time,
			UpdatedAt:    row.UpdatedAt.Time,
		},
		CompanyName:   row.CompanyName,
		CandidateName: row.CandidateName,
		JobTitle:      textPtr(row.JobTitle),
	}
}

func candidateRowToDomain(row *generated.ListScoutMessagesByCandidateIDRow) *scout.ScoutMessageWithNames {
	return &scout.ScoutMessageWithNames{
		ScoutMessage: scout.ScoutMessage{
			ID:           uuidToString(row.ID),
			CompanyID:    uuidToString(row.CompanyID),
			CandidateID:  uuidToString(row.CandidateID),
			JobPostingID: uuidPtr(row.JobPostingID),
			TemplateID:   uuidPtr(row.TemplateID),
			Subject:      row.Subject,
			Body:         row.Body,
			Status:       scout.Status(row.Status),
			SentAt:       timestamptzToTimePtr(row.SentAt),
			OpenedAt:     timestamptzToTimePtr(row.OpenedAt),
			RepliedAt:    timestamptzToTimePtr(row.RepliedAt),
			ExpiresAt:    timestamptzToTimePtr(row.ExpiresAt),
			ResendCount:  row.ResendCount,
			CreatedAt:    row.CreatedAt.Time,
			UpdatedAt:    row.UpdatedAt.Time,
		},
		CompanyName:   row.CompanyName,
		CandidateName: row.CandidateName,
		JobTitle:      textPtr(row.JobTitle),
	}
}
