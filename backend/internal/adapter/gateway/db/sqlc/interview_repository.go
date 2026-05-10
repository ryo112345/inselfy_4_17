package sqlc

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/interview"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ── Proposal Repository ──

type InterviewProposalRepository struct {
	queries *generated.Queries
}

var _ port.InterviewProposalRepository = (*InterviewProposalRepository)(nil)

func NewInterviewProposalRepository(pool *pgxpool.Pool) *InterviewProposalRepository {
	return &InterviewProposalRepository{queries: generated.New(pool)}
}

func (r *InterviewProposalRepository) Create(ctx context.Context, p *interview.Proposal) (*interview.Proposal, error) {
	q := queriesForContext(ctx, r.queries)
	appID, err := parseUUID(p.ApplicationID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	companyID, err := parseUUID(p.CompanyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	candidateID, err := parseUUID(p.CandidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	var msgID pgtype.UUID
	if p.MessageID != "" {
		msgID, err = parseUUID(p.MessageID)
		if err != nil {
			return nil, domainerr.ErrBadRequest
		}
	}
	dur := int32(p.DurationMinutes)
	if dur <= 0 {
		dur = 60
	}
	row, err := q.CreateInterviewProposal(ctx, &generated.CreateInterviewProposalParams{
		ApplicationID:   appID,
		CompanyID:       companyID,
		CandidateID:     candidateID,
		Message:         pgtype.Text{String: p.Message, Valid: p.Message != ""},
		Status:          p.Status,
		MessageID:       msgID,
		DurationMinutes: dur,
		ExpiresAt:       pgtype.Timestamptz{Time: p.ExpiresAt, Valid: true},
	})
	if err != nil {
		return nil, err
	}
	return proposalToDomain(row), nil
}

func (r *InterviewProposalRepository) GetByID(ctx context.Context, id string) (*interview.Proposal, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetInterviewProposalByID(ctx, pgID)
	if err != nil {
		return nil, err
	}
	return proposalToDomain(row), nil
}

func (r *InterviewProposalRepository) UpdateStatus(ctx context.Context, id, status string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.UpdateInterviewProposalStatus(ctx, &generated.UpdateInterviewProposalStatusParams{
		ID:     pgID,
		Status: status,
	})
}

func (r *InterviewProposalRepository) UpdateMessageID(ctx context.Context, id, messageID string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	msgID, err := parseUUID(messageID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.UpdateInterviewProposalMessageID(ctx, &generated.UpdateInterviewProposalMessageIDParams{
		ID:        pgID,
		MessageID: msgID,
	})
}

func (r *InterviewProposalRepository) ListPendingByCandidate(ctx context.Context, candidateID string) ([]*interview.Proposal, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(candidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListPendingProposalsByCandidate(ctx, pgID)
	if err != nil {
		return nil, err
	}
	result := make([]*interview.Proposal, len(rows))
	for i, row := range rows {
		result[i] = proposalToDomain(row)
	}
	return result, nil
}

func (r *InterviewProposalRepository) CancelPendingByApplication(ctx context.Context, applicationID string) ([]*interview.Proposal, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(applicationID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.CancelPendingProposalsByApplication(ctx, pgID)
	if err != nil {
		return nil, err
	}
	result := make([]*interview.Proposal, len(rows))
	for i, row := range rows {
		result[i] = proposalToDomain(row)
	}
	return result, nil
}

func proposalToDomain(row *generated.InterviewProposal) *interview.Proposal {
	return &interview.Proposal{
		ID:              uuidToString(row.ID),
		ApplicationID:   uuidToString(row.ApplicationID),
		CompanyID:       uuidToString(row.CompanyID),
		CandidateID:     uuidToString(row.CandidateID),
		Message:         row.Message.String,
		Status:          row.Status,
		MessageID:       uuidToString(row.MessageID),
		DurationMinutes: int(row.DurationMinutes),
		ExpiresAt:       row.ExpiresAt.Time,
		CreatedAt:       row.CreatedAt.Time,
		UpdatedAt:       row.UpdatedAt.Time,
	}
}

// ── Slot Repository ──

type InterviewSlotRepository struct {
	queries *generated.Queries
}

var _ port.InterviewSlotRepository = (*InterviewSlotRepository)(nil)

func NewInterviewSlotRepository(pool *pgxpool.Pool) *InterviewSlotRepository {
	return &InterviewSlotRepository{queries: generated.New(pool)}
}

func (r *InterviewSlotRepository) Create(ctx context.Context, s *interview.Slot) (*interview.Slot, error) {
	q := queriesForContext(ctx, r.queries)
	proposalID, err := parseUUID(s.ProposalID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	appID, err := parseUUID(s.ApplicationID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	proposedBy, err := parseUUID(s.ProposedBy)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateInterviewSlot(ctx, &generated.CreateInterviewSlotParams{
		ProposalID:    proposalID,
		ApplicationID: appID,
		ProposedBy:    proposedBy,
		StartTime:     pgtype.Timestamptz{Time: s.StartTime, Valid: true},
		EndTime:       pgtype.Timestamptz{Time: s.EndTime, Valid: true},
		Status:        s.Status,
	})
	if err != nil {
		return nil, err
	}
	return slotToDomain(row), nil
}

func (r *InterviewSlotRepository) GetByID(ctx context.Context, id string) (*interview.Slot, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetInterviewSlotByID(ctx, pgID)
	if err != nil {
		return nil, err
	}
	return slotToDomain(row), nil
}

func (r *InterviewSlotRepository) ListByProposal(ctx context.Context, proposalID string) ([]*interview.Slot, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(proposalID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListSlotsByProposal(ctx, pgID)
	if err != nil {
		return nil, err
	}
	result := make([]*interview.Slot, len(rows))
	for i, row := range rows {
		result[i] = slotToDomain(row)
	}
	return result, nil
}

func (r *InterviewSlotRepository) UpdateStatus(ctx context.Context, id, status string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.UpdateInterviewSlotStatus(ctx, &generated.UpdateInterviewSlotStatusParams{
		ID:     pgID,
		Status: status,
	})
}

func (r *InterviewSlotRepository) RejectOthers(ctx context.Context, proposalID, selectedID string) error {
	q := queriesForContext(ctx, r.queries)
	pID, err := parseUUID(proposalID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	sID, err := parseUUID(selectedID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.RejectOtherSlots(ctx, &generated.RejectOtherSlotsParams{
		ProposalID: pID,
		ID:         sID,
	})
}

func slotToDomain(row *generated.InterviewSlot) *interview.Slot {
	return &interview.Slot{
		ID:            uuidToString(row.ID),
		ProposalID:    uuidToString(row.ProposalID),
		ApplicationID: uuidToString(row.ApplicationID),
		ProposedBy:    uuidToString(row.ProposedBy),
		StartTime:     row.StartTime.Time,
		EndTime:       row.EndTime.Time,
		Status:        row.Status,
		CreatedAt:     row.CreatedAt.Time,
		UpdatedAt:     row.UpdatedAt.Time,
	}
}

// ── Interview Repository ──

type InterviewRepositoryImpl struct {
	queries *generated.Queries
}

var _ port.InterviewRepository = (*InterviewRepositoryImpl)(nil)

func NewInterviewRepository(pool *pgxpool.Pool) *InterviewRepositoryImpl {
	return &InterviewRepositoryImpl{queries: generated.New(pool)}
}

func (r *InterviewRepositoryImpl) Create(ctx context.Context, iv *interview.Interview) (*interview.Interview, error) {
	q := queriesForContext(ctx, r.queries)
	appID, err := parseUUID(iv.ApplicationID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	companyID, err := parseUUID(iv.CompanyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	candidateID, err := parseUUID(iv.CandidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateInterview(ctx, &generated.CreateInterviewParams{
		ApplicationID: appID,
		CompanyID:     companyID,
		CandidateID:   candidateID,
		Title:         iv.Title,
		StartTime:     pgtype.Timestamptz{Time: iv.StartTime, Valid: true},
		EndTime:       pgtype.Timestamptz{Time: iv.EndTime, Valid: true},
		Location:      pgtype.Text{String: iv.Location, Valid: iv.Location != ""},
		MeetingUrl:    pgtype.Text{String: iv.MeetingURL, Valid: iv.MeetingURL != ""},
		InternalNotes: pgtype.Text{String: iv.InternalNotes, Valid: iv.InternalNotes != ""},
		Status:        iv.Status,
		SelectedSlotID: optionalUUID(strPtr(iv.SelectedSlotID)),
		ProposalID:     optionalUUID(strPtr(iv.ProposalID)),
	})
	if err != nil {
		return nil, err
	}
	return interviewToDomain(row), nil
}

func (r *InterviewRepositoryImpl) GetByID(ctx context.Context, id string) (*interview.Interview, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetInterviewByID(ctx, pgID)
	if err != nil {
		return nil, err
	}
	return interviewToDomain(row), nil
}

func (r *InterviewRepositoryImpl) ListByCompany(ctx context.Context, companyID string, from, to time.Time) ([]*interview.Interview, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(companyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListInterviewsByCompany(ctx, &generated.ListInterviewsByCompanyParams{
		CompanyID: pgID,
		StartTime: pgtype.Timestamptz{Time: from, Valid: true},
		StartTime_2: pgtype.Timestamptz{Time: to, Valid: true},
	})
	if err != nil {
		return nil, err
	}
	result := make([]*interview.Interview, len(rows))
	for i, row := range rows {
		result[i] = interviewToDomain(row)
	}
	return result, nil
}

func (r *InterviewRepositoryImpl) ListByCandidate(ctx context.Context, candidateID string) ([]*interview.Interview, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(candidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListInterviewsByCandidate(ctx, pgID)
	if err != nil {
		return nil, err
	}
	result := make([]*interview.Interview, len(rows))
	for i, row := range rows {
		result[i] = interviewToDomain(row)
	}
	return result, nil
}

func (r *InterviewRepositoryImpl) UpdateStatus(ctx context.Context, id, status string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.UpdateInterviewStatus(ctx, &generated.UpdateInterviewStatusParams{
		ID:     pgID,
		Status: status,
	})
}

func interviewToDomain(row *generated.Interview) *interview.Interview {
	return &interview.Interview{
		ID:             uuidToString(row.ID),
		ApplicationID:  uuidToString(row.ApplicationID),
		CompanyID:      uuidToString(row.CompanyID),
		CandidateID:    uuidToString(row.CandidateID),
		Title:          row.Title,
		StartTime:      row.StartTime.Time,
		EndTime:        row.EndTime.Time,
		Location:       row.Location.String,
		MeetingURL:     row.MeetingUrl.String,
		InternalNotes:  row.InternalNotes.String,
		Status:         row.Status,
		SelectedSlotID: uuidToString(row.SelectedSlotID),
		ProposalID:     uuidToString(row.ProposalID),
		CreatedAt:      row.CreatedAt.Time,
		UpdatedAt:      row.UpdatedAt.Time,
	}
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
