package usecase

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/interview"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/port"
)

const (
	defaultProposalExpiresInDays  = 7
	defaultInterviewDurationMin   = 60
	defaultProposalMessageBody    = "面接日程のご提案です。ご都合の良い日時をお選びください。"
	interviewConfirmedMessageBody = "面接日程が確定しました"
	interviewCancelledMessageBody = "面接がキャンセルされました"
)

type InterviewInteractor struct {
	proposalRepo    port.InterviewProposalRepository
	slotRepo        port.InterviewSlotRepository
	interviewRepo   port.InterviewRepository
	convRepo        port.ConversationRepository
	msgRepo         port.MessageRepository
	participantRepo port.ConversationParticipantRepository
	query           port.InterviewQueryService
	tx              port.TxManager
}

var _ port.InterviewInputPort = (*InterviewInteractor)(nil)

func NewInterviewInteractor(
	proposalRepo port.InterviewProposalRepository,
	slotRepo port.InterviewSlotRepository,
	interviewRepo port.InterviewRepository,
	convRepo port.ConversationRepository,
	msgRepo port.MessageRepository,
	participantRepo port.ConversationParticipantRepository,
	query port.InterviewQueryService,
	tx port.TxManager,
) *InterviewInteractor {
	return &InterviewInteractor{
		proposalRepo:    proposalRepo,
		slotRepo:        slotRepo,
		interviewRepo:   interviewRepo,
		convRepo:        convRepo,
		msgRepo:         msgRepo,
		participantRepo: participantRepo,
		query:           query,
		tx:              tx,
	}
}

func (i *InterviewInteractor) Propose(ctx context.Context, input interview.ProposeInput) (*interview.ProposeOutput, error) {
	candidateID, err := i.query.ApplicationCandidateID(ctx, input.ApplicationID, input.CompanyID)
	if err != nil {
		return nil, interview.ErrApplicationNotFound
	}

	expiresInDays := input.ExpiresInDays
	if expiresInDays <= 0 {
		expiresInDays = defaultProposalExpiresInDays
	}
	durationMinutes := input.DurationMinutes
	if durationMinutes <= 0 {
		durationMinutes = defaultInterviewDurationMin
	}

	var proposal *interview.Proposal
	var createdSlots []*interview.Slot
	var cancelledProposals []*interview.Proposal

	err = i.tx.WithinTransaction(ctx, func(txCtx context.Context) error {
		// Cancel any existing pending proposals for this application
		cancelled, _ := i.proposalRepo.CancelPendingByApplication(txCtx, input.ApplicationID)
		cancelledProposals = cancelled

		var txErr error
		proposal, txErr = i.proposalRepo.Create(txCtx, &interview.Proposal{
			ApplicationID:   input.ApplicationID,
			CompanyID:       input.CompanyID,
			CandidateID:     candidateID,
			Message:         input.Message,
			DurationMinutes: durationMinutes,
			Status:          "pending",
			ExpiresAt:       time.Now().Add(time.Duration(expiresInDays) * 24 * time.Hour),
		})
		if txErr != nil {
			return txErr
		}

		createdSlots = make([]*interview.Slot, len(input.Slots))
		for idx, s := range input.Slots {
			slot, err := i.slotRepo.Create(txCtx, &interview.Slot{
				ProposalID:    proposal.ID,
				ApplicationID: input.ApplicationID,
				ProposedBy:    input.CompanyID,
				StartTime:     s.StartTime,
				EndTime:       s.EndTime,
				Status:        "proposed",
			})
			if err != nil {
				return err
			}
			createdSlots[idx] = slot
		}

		conv, err := i.findOrCreateConversation(txCtx, input.CompanyID, candidateID)
		if err != nil {
			return err
		}

		// Build structured message metadata
		slotData := make([]map[string]string, len(createdSlots))
		for idx, s := range createdSlots {
			slotData[idx] = map[string]string{
				"id":         s.ID,
				"start_time": s.StartTime.Format(time.RFC3339),
				"end_time":   s.EndTime.Format(time.RFC3339),
			}
		}
		metadata := map[string]interface{}{
			"proposal_id":      proposal.ID,
			"slots":            slotData,
			"location":         input.Location,
			"duration_minutes": durationMinutes,
			"expires_at":       proposal.ExpiresAt.Format(time.RFC3339),
		}

		bodyText := input.Message
		if bodyText == "" {
			bodyText = defaultProposalMessageBody
		}

		msg, err := i.msgRepo.Create(txCtx, &messaging.Message{
			ConversationID: conv.ID,
			SenderType:     "company",
			SenderID:       input.CompanyID,
			Body:           bodyText,
			MessageType:    "interview_proposal",
			Metadata:       metadata,
		})
		if err != nil {
			return err
		}

		if err := i.convRepo.UpdateLastMessageAt(txCtx, conv.ID); err != nil {
			return err
		}

		return i.proposalRepo.UpdateMessageID(txCtx, proposal.ID, msg.ID)
	})
	if err != nil {
		return nil, err
	}

	// Auto-update application status to "interview" if currently applied/screening.
	// Runs outside the transaction and failures are deliberately ignored.
	_ = i.query.MarkApplicationInterviewing(ctx, input.ApplicationID)

	cancelledIDs := make([]string, len(cancelledProposals))
	for idx, cp := range cancelledProposals {
		cancelledIDs[idx] = cp.ID
	}

	return &interview.ProposeOutput{
		Proposal:             proposal,
		Slots:                createdSlots,
		CancelledProposalIDs: cancelledIDs,
	}, nil
}

func (i *InterviewInteractor) findOrCreateConversation(ctx context.Context, companyID, candidateID string) (*messaging.Conversation, error) {
	conv, err := i.convRepo.GetByCompanyAndCandidate(ctx, companyID, candidateID)
	if err == nil {
		return conv, nil
	}
	conv, err = i.convRepo.Create(ctx, &messaging.Conversation{
		CompanyID:   companyID,
		CandidateID: candidateID,
	})
	if err != nil {
		return nil, err
	}
	if err := i.participantRepo.Create(ctx, &messaging.ConversationParticipant{
		ConversationID:  conv.ID,
		ParticipantType: "company",
		ParticipantID:   companyID,
	}); err != nil {
		return nil, err
	}
	if err := i.participantRepo.Create(ctx, &messaging.ConversationParticipant{
		ConversationID:  conv.ID,
		ParticipantType: "candidate",
		ParticipantID:   candidateID,
	}); err != nil {
		return nil, err
	}
	return conv, nil
}

func (i *InterviewInteractor) SelectSlot(ctx context.Context, input interview.SelectSlotInput) (*interview.Interview, error) {
	proposal, err := i.proposalRepo.GetByID(ctx, input.ProposalID)
	if err != nil {
		return nil, interview.ErrProposalNotFound
	}
	if proposal.CandidateID != input.CandidateID {
		return nil, interview.ErrNotProposalOwner
	}
	if proposal.Status != "pending" {
		return nil, interview.ErrProposalNotPending
	}
	if time.Now().After(proposal.ExpiresAt) {
		return nil, interview.ErrProposalExpired
	}

	slot, err := i.slotRepo.GetByID(ctx, input.SlotID)
	if err != nil {
		return nil, interview.ErrSlotNotFound
	}
	if slot.ProposalID != input.ProposalID {
		return nil, interview.ErrSlotNotInProposal
	}

	interviewStart := slot.StartTime
	interviewEnd := slot.EndTime
	if input.StartTime != nil && input.EndTime != nil {
		st, et := *input.StartTime, *input.EndTime
		if st.Before(slot.StartTime) || et.After(slot.EndTime) || !et.After(st) {
			return nil, interview.ErrTimeOutsideSlot
		}
		interviewStart = st
		interviewEnd = et
	}

	var iv *interview.Interview

	err = i.tx.WithinTransaction(ctx, func(txCtx context.Context) error {
		if err := i.slotRepo.UpdateStatus(txCtx, input.SlotID, "selected"); err != nil {
			return err
		}
		if err := i.slotRepo.RejectOthers(txCtx, input.ProposalID, input.SlotID); err != nil {
			return err
		}
		if err := i.proposalRepo.UpdateStatus(txCtx, input.ProposalID, "confirmed"); err != nil {
			return err
		}

		var txErr error
		iv, txErr = i.interviewRepo.Create(txCtx, &interview.Interview{
			ApplicationID:  proposal.ApplicationID,
			CompanyID:      proposal.CompanyID,
			CandidateID:    input.CandidateID,
			Title:          "面接",
			StartTime:      interviewStart,
			EndTime:        interviewEnd,
			Status:         "scheduled",
			SelectedSlotID: input.SlotID,
			ProposalID:     input.ProposalID,
		})
		if txErr != nil {
			return txErr
		}

		// Send confirmation message; if the conversation is missing, skip it
		// without failing the transaction.
		conv, err := i.convRepo.GetByCompanyAndCandidate(txCtx, proposal.CompanyID, input.CandidateID)
		if err != nil {
			return nil
		}
		metadata := map[string]interface{}{
			"interview_id": iv.ID,
			"start_time":   slot.StartTime.Format(time.RFC3339),
			"end_time":     slot.EndTime.Format(time.RFC3339),
		}
		_, err = i.msgRepo.Create(txCtx, &messaging.Message{
			ConversationID: conv.ID,
			SenderType:     "system",
			SenderID:       input.CandidateID,
			Body:           interviewConfirmedMessageBody,
			MessageType:    "interview_confirmed",
			Metadata:       metadata,
		})
		if err != nil {
			return err
		}
		return i.convRepo.UpdateLastMessageAt(txCtx, conv.ID)
	})
	if err != nil {
		return nil, err
	}

	return iv, nil
}

func (i *InterviewInteractor) ListByCompany(ctx context.Context, companyID string, from, to time.Time) ([]*interview.InterviewWithNames, error) {
	interviews, err := i.interviewRepo.ListByCompany(ctx, companyID, from, to)
	if err != nil {
		return nil, err
	}

	// Enrich with candidate names and job titles; lookup failures leave the
	// fields empty (same as the previous implementation).
	result := make([]*interview.InterviewWithNames, len(interviews))
	for idx, iv := range interviews {
		name, avatar, _ := i.query.CandidateNameAndAvatar(ctx, iv.CandidateID)
		jobTitle, _ := i.query.JobTitleByApplication(ctx, iv.ApplicationID)
		result[idx] = &interview.InterviewWithNames{
			Interview:       *iv,
			CandidateName:   name,
			CandidateAvatar: avatar,
			JobTitle:        jobTitle,
		}
	}
	return result, nil
}

func (i *InterviewInteractor) ListByCandidate(ctx context.Context, candidateID string) ([]*interview.InterviewWithNames, []*interview.ProposalWithDetails, error) {
	interviews, err := i.interviewRepo.ListByCandidate(ctx, candidateID)
	if err != nil {
		return nil, nil, err
	}

	result := make([]*interview.InterviewWithNames, len(interviews))
	for idx, iv := range interviews {
		companyName, _ := i.query.CompanyName(ctx, iv.CompanyID)
		jobTitle, _ := i.query.JobTitleByApplication(ctx, iv.ApplicationID)
		result[idx] = &interview.InterviewWithNames{
			Interview:   *iv,
			CompanyName: companyName,
			JobTitle:    jobTitle,
		}
	}

	// Pending proposals are best-effort: a listing failure yields an empty
	// list, and proposals whose slots fail to load are skipped.
	proposals, err := i.proposalRepo.ListPendingByCandidate(ctx, candidateID)
	if err != nil {
		proposals = nil
	}
	pending := make([]*interview.ProposalWithDetails, 0, len(proposals))
	for _, p := range proposals {
		slots, err := i.slotRepo.ListByProposal(ctx, p.ID)
		if err != nil {
			continue
		}
		companyName, _ := i.query.CompanyName(ctx, p.CompanyID)
		jobTitle, _ := i.query.JobTitleByApplication(ctx, p.ApplicationID)
		pending = append(pending, &interview.ProposalWithDetails{
			ID:              p.ID,
			CompanyName:     companyName,
			JobTitle:        jobTitle,
			Message:         p.Message,
			DurationMinutes: p.DurationMinutes,
			Slots:           slots,
			ExpiresAt:       p.ExpiresAt,
			CreatedAt:       p.CreatedAt,
		})
	}

	return result, pending, nil
}

func (i *InterviewInteractor) CancelInterview(ctx context.Context, interviewID, companyID, userID string) error {
	iv, err := i.interviewRepo.GetByID(ctx, interviewID)
	if err != nil {
		return interview.ErrInterviewNotFound
	}

	if companyID != "" && iv.CompanyID != companyID {
		return port.ErrForbidden
	}
	if userID != "" && iv.CandidateID != userID {
		return port.ErrForbidden
	}
	if companyID == "" && userID == "" {
		return interview.ErrCancelUnauthorized
	}

	if iv.Status != "scheduled" {
		return interview.ErrInterviewNotScheduled
	}

	return i.tx.WithinTransaction(ctx, func(txCtx context.Context) error {
		if err := i.interviewRepo.UpdateStatus(txCtx, interviewID, "cancelled"); err != nil {
			return err
		}

		// Missing conversation skips the notification without failing.
		conv, err := i.convRepo.GetByCompanyAndCandidate(txCtx, iv.CompanyID, iv.CandidateID)
		if err != nil {
			return nil
		}

		senderType := "company"
		senderID := companyID
		if userID != "" {
			senderType = "candidate"
			senderID = userID
		}

		metadata := map[string]interface{}{
			"interview_id": iv.ID,
			"start_time":   iv.StartTime.Format(time.RFC3339),
			"end_time":     iv.EndTime.Format(time.RFC3339),
		}

		_, err = i.msgRepo.Create(txCtx, &messaging.Message{
			ConversationID: conv.ID,
			SenderType:     senderType,
			SenderID:       senderID,
			Body:           interviewCancelledMessageBody,
			MessageType:    "interview_cancelled",
			Metadata:       metadata,
		})
		if err != nil {
			return err
		}
		return i.convRepo.UpdateLastMessageAt(txCtx, conv.ID)
	})
}

func (i *InterviewInteractor) GetPendingProposal(ctx context.Context, applicationID string) (*interview.PendingProposal, error) {
	return i.query.PendingProposalByApplication(ctx, applicationID)
}

func (i *InterviewInteractor) GetProposalSlots(ctx context.Context, proposalID string) (*interview.Proposal, []*interview.Slot, error) {
	proposal, err := i.proposalRepo.GetByID(ctx, proposalID)
	if err != nil {
		return nil, nil, interview.ErrProposalNotFound
	}
	slots, err := i.slotRepo.ListByProposal(ctx, proposalID)
	if err != nil {
		return nil, nil, err
	}
	return proposal, slots, nil
}
