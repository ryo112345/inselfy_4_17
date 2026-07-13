package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/interview"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/port"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

func newInterviewInteractor(
	proposalRepo *interviewProposalRepoStub,
	slotRepo *interviewSlotRepoStub,
	ivRepo *interviewRepoStub,
	convRepo *conversationRepoStub,
	msgRepo *messageRepoStub,
	query *interviewQueryStub,
) *usecase.InterviewInteractor {
	return usecase.NewInterviewInteractor(
		proposalRepo, slotRepo, ivRepo,
		convRepo, msgRepo, &participantRepoStub{},
		query, inlineTxManager{},
	)
}

func TestInterviewInteractor_Propose_AppliesDefaults(t *testing.T) {
	ctx := context.Background()

	var createdProposal *interview.Proposal
	var sentMessage *messaging.Message
	markCalled := 0

	proposalRepo := &interviewProposalRepoStub{
		createFn: func(_ context.Context, p *interview.Proposal) (*interview.Proposal, error) {
			createdProposal = p
			out := *p
			out.ID = "prop-1"
			return &out, nil
		},
	}
	slotRepo := &interviewSlotRepoStub{
		createFn: func(_ context.Context, sl *interview.Slot) (*interview.Slot, error) {
			out := *sl
			out.ID = "slot-" + sl.StartTime.Format("15")
			return &out, nil
		},
	}
	convRepo := &conversationRepoStub{
		getByCompanyAndCandidateFn: func(_ context.Context, _, _ string) (*messaging.Conversation, error) {
			return &messaging.Conversation{ID: "conv-1"}, nil
		},
	}
	msgRepo := &messageRepoStub{
		createFn: func(_ context.Context, m *messaging.Message) (*messaging.Message, error) {
			sentMessage = m
			out := *m
			out.ID = "msg-1"
			return &out, nil
		},
	}
	query := &interviewQueryStub{
		applicationCandidateIDFn: func(_ context.Context, _, _ string) (string, error) {
			return "cand-1", nil
		},
		markApplicationInterviewingFn: func(_ context.Context, _ string) error {
			markCalled++
			return nil
		},
	}

	it := newInterviewInteractor(proposalRepo, slotRepo, &interviewRepoStub{}, convRepo, msgRepo, query)

	start := time.Date(2026, 8, 3, 10, 0, 0, 0, time.UTC)
	out, err := it.Propose(ctx, interview.ProposeInput{
		ApplicationID: "app-1",
		CompanyID:     "co-1",
		Slots:         []interview.SlotInput{{StartTime: start, EndTime: start.Add(time.Hour)}},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if createdProposal.DurationMinutes != 60 {
		t.Errorf("default duration should be 60, got %d", createdProposal.DurationMinutes)
	}
	wantExpiry := time.Now().Add(7 * 24 * time.Hour)
	if d := createdProposal.ExpiresAt.Sub(wantExpiry); d < -time.Minute || d > time.Minute {
		t.Errorf("default expiry should be ~7 days out, got %v", createdProposal.ExpiresAt)
	}
	if createdProposal.CandidateID != "cand-1" || createdProposal.Status != "pending" {
		t.Errorf("proposal should target the application's candidate with pending status: %+v", createdProposal)
	}
	if sentMessage.Body != "面接日程のご提案です。ご都合の良い日時をお選びください。" {
		t.Errorf("empty message should fall back to the default body, got %q", sentMessage.Body)
	}
	if sentMessage.MessageType != "interview_proposal" {
		t.Errorf("unexpected message type %q", sentMessage.MessageType)
	}
	if markCalled != 1 {
		t.Errorf("application status auto-update should run once, ran %d times", markCalled)
	}
	if len(out.Slots) != 1 || out.Proposal.ID != "prop-1" {
		t.Errorf("output should carry created proposal and slots: %+v", out)
	}
}

func TestInterviewInteractor_Propose_CancelsPendingAndReportsIDs(t *testing.T) {
	ctx := context.Background()

	proposalRepo := &interviewProposalRepoStub{
		cancelPendingByApplicationFn: func(_ context.Context, _ string) ([]*interview.Proposal, error) {
			return []*interview.Proposal{{ID: "old-1"}, {ID: "old-2"}}, nil
		},
		createFn: func(_ context.Context, p *interview.Proposal) (*interview.Proposal, error) {
			out := *p
			out.ID = "prop-2"
			return &out, nil
		},
	}
	slotRepo := &interviewSlotRepoStub{
		createFn: func(_ context.Context, sl *interview.Slot) (*interview.Slot, error) { return sl, nil },
	}
	convRepo := &conversationRepoStub{
		getByCompanyAndCandidateFn: func(_ context.Context, _, _ string) (*messaging.Conversation, error) {
			return &messaging.Conversation{ID: "conv-1"}, nil
		},
	}
	query := &interviewQueryStub{
		applicationCandidateIDFn: func(_ context.Context, _, _ string) (string, error) { return "cand-1", nil },
	}

	it := newInterviewInteractor(proposalRepo, slotRepo, &interviewRepoStub{}, convRepo, &messageRepoStub{}, query)

	start := time.Date(2026, 8, 3, 10, 0, 0, 0, time.UTC)
	out, err := it.Propose(ctx, interview.ProposeInput{
		ApplicationID: "app-1",
		CompanyID:     "co-1",
		Slots:         []interview.SlotInput{{StartTime: start, EndTime: start.Add(time.Hour)}},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(out.CancelledProposalIDs) != 2 || out.CancelledProposalIDs[0] != "old-1" || out.CancelledProposalIDs[1] != "old-2" {
		t.Errorf("cancelled proposal IDs should be reported for WS notification, got %v", out.CancelledProposalIDs)
	}
}

func TestInterviewInteractor_Propose_ApplicationNotFound(t *testing.T) {
	query := &interviewQueryStub{
		applicationCandidateIDFn: func(_ context.Context, _, _ string) (string, error) {
			return "", errors.New("no rows")
		},
	}
	it := newInterviewInteractor(&interviewProposalRepoStub{}, &interviewSlotRepoStub{}, &interviewRepoStub{}, &conversationRepoStub{}, &messageRepoStub{}, query)

	start := time.Now().Add(24 * time.Hour)
	_, err := it.Propose(context.Background(), interview.ProposeInput{
		ApplicationID: "app-x",
		CompanyID:     "co-1",
		Slots:         []interview.SlotInput{{StartTime: start, EndTime: start.Add(time.Hour)}},
	})
	if !errors.Is(err, interview.ErrApplicationNotFound) {
		t.Fatalf("expected ErrApplicationNotFound, got %v", err)
	}
}

func TestInterviewInteractor_Propose_SlotValidation(t *testing.T) {
	query := &interviewQueryStub{
		applicationCandidateIDFn: func(_ context.Context, _, _ string) (string, error) {
			return "cand-1", nil
		},
	}
	it := newInterviewInteractor(&interviewProposalRepoStub{}, &interviewSlotRepoStub{}, &interviewRepoStub{}, &conversationRepoStub{}, &messageRepoStub{}, query)

	start := time.Now().Add(24 * time.Hour)

	if _, err := it.Propose(context.Background(), interview.ProposeInput{ApplicationID: "app-1", CompanyID: "co-1"}); !errors.Is(err, interview.ErrNoSlots) {
		t.Fatalf("expected ErrNoSlots, got %v", err)
	}

	many := make([]interview.SlotInput, 11)
	for i := range many {
		many[i] = interview.SlotInput{StartTime: start, EndTime: start.Add(time.Hour)}
	}
	if _, err := it.Propose(context.Background(), interview.ProposeInput{ApplicationID: "app-1", CompanyID: "co-1", Slots: many}); !errors.Is(err, interview.ErrTooManySlots) {
		t.Fatalf("expected ErrTooManySlots, got %v", err)
	}

	if _, err := it.Propose(context.Background(), interview.ProposeInput{
		ApplicationID: "app-1", CompanyID: "co-1",
		Slots: []interview.SlotInput{{StartTime: start, EndTime: start}},
	}); !errors.Is(err, interview.ErrInvalidTimeRange) {
		t.Fatalf("expected ErrInvalidTimeRange, got %v", err)
	}
}

func selectSlotFixture(proposal *interview.Proposal, slot *interview.Slot) (*interviewProposalRepoStub, *interviewSlotRepoStub, *interviewRepoStub, *conversationRepoStub) {
	proposalRepo := &interviewProposalRepoStub{
		getByIDFn: func(_ context.Context, _ string) (*interview.Proposal, error) {
			if proposal == nil {
				return nil, errors.New("no rows")
			}
			return proposal, nil
		},
	}
	slotRepo := &interviewSlotRepoStub{
		getByIDFn: func(_ context.Context, _ string) (*interview.Slot, error) {
			if slot == nil {
				return nil, errors.New("no rows")
			}
			return slot, nil
		},
	}
	ivRepo := &interviewRepoStub{
		createFn: func(_ context.Context, iv *interview.Interview) (*interview.Interview, error) {
			out := *iv
			out.ID = "iv-1"
			return &out, nil
		},
	}
	convRepo := &conversationRepoStub{
		getByCompanyAndCandidateFn: func(_ context.Context, _, _ string) (*messaging.Conversation, error) {
			return &messaging.Conversation{ID: "conv-1"}, nil
		},
	}
	return proposalRepo, slotRepo, ivRepo, convRepo
}

func TestInterviewInteractor_SelectSlot_Validations(t *testing.T) {
	slotStart := time.Date(2026, 8, 3, 10, 0, 0, 0, time.UTC)
	slotEnd := slotStart.Add(2 * time.Hour)
	validProposal := func() *interview.Proposal {
		return &interview.Proposal{
			ID: "prop-1", ApplicationID: "app-1", CompanyID: "co-1",
			CandidateID: "cand-1", Status: "pending",
			ExpiresAt: time.Now().Add(24 * time.Hour),
		}
	}
	validSlot := func() *interview.Slot {
		return &interview.Slot{ID: "slot-1", ProposalID: "prop-1", StartTime: slotStart, EndTime: slotEnd}
	}
	timePtr := func(tm time.Time) *time.Time { return &tm }

	cases := []struct {
		name     string
		proposal *interview.Proposal
		slot     *interview.Slot
		input    interview.SelectSlotInput
		wantErr  error
	}{
		{
			name:    "proposal not found",
			slot:    validSlot(),
			input:   interview.SelectSlotInput{ProposalID: "prop-x", SlotID: "slot-1", CandidateID: "cand-1"},
			wantErr: interview.ErrProposalNotFound,
		},
		{
			name:     "not the proposal's candidate",
			proposal: validProposal(),
			slot:     validSlot(),
			input:    interview.SelectSlotInput{ProposalID: "prop-1", SlotID: "slot-1", CandidateID: "cand-other"},
			wantErr:  interview.ErrNotProposalOwner,
		},
		{
			name: "proposal not pending",
			proposal: func() *interview.Proposal {
				p := validProposal()
				p.Status = "confirmed"
				return p
			}(),
			slot:    validSlot(),
			input:   interview.SelectSlotInput{ProposalID: "prop-1", SlotID: "slot-1", CandidateID: "cand-1"},
			wantErr: interview.ErrProposalNotPending,
		},
		{
			name: "proposal expired",
			proposal: func() *interview.Proposal {
				p := validProposal()
				p.ExpiresAt = time.Now().Add(-time.Hour)
				return p
			}(),
			slot:    validSlot(),
			input:   interview.SelectSlotInput{ProposalID: "prop-1", SlotID: "slot-1", CandidateID: "cand-1"},
			wantErr: interview.ErrProposalExpired,
		},
		{
			name:     "slot not found",
			proposal: validProposal(),
			input:    interview.SelectSlotInput{ProposalID: "prop-1", SlotID: "slot-x", CandidateID: "cand-1"},
			wantErr:  interview.ErrSlotNotFound,
		},
		{
			name:     "slot belongs to another proposal",
			proposal: validProposal(),
			slot: func() *interview.Slot {
				s := validSlot()
				s.ProposalID = "prop-other"
				return s
			}(),
			input:   interview.SelectSlotInput{ProposalID: "prop-1", SlotID: "slot-1", CandidateID: "cand-1"},
			wantErr: interview.ErrSlotNotInProposal,
		},
		{
			name:     "narrowed time outside slot range",
			proposal: validProposal(),
			slot:     validSlot(),
			input: interview.SelectSlotInput{
				ProposalID: "prop-1", SlotID: "slot-1", CandidateID: "cand-1",
				StartTime: timePtr(slotStart.Add(-time.Minute)),
				EndTime:   timePtr(slotEnd),
			},
			wantErr: interview.ErrTimeOutsideSlot,
		},
		{
			name:     "narrowed end before start",
			proposal: validProposal(),
			slot:     validSlot(),
			input: interview.SelectSlotInput{
				ProposalID: "prop-1", SlotID: "slot-1", CandidateID: "cand-1",
				StartTime: timePtr(slotStart.Add(time.Hour)),
				EndTime:   timePtr(slotStart.Add(time.Hour)),
			},
			wantErr: interview.ErrTimeOutsideSlot,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			proposalRepo, slotRepo, ivRepo, convRepo := selectSlotFixture(tc.proposal, tc.slot)
			it := newInterviewInteractor(proposalRepo, slotRepo, ivRepo, convRepo, &messageRepoStub{}, &interviewQueryStub{})
			_, err := it.SelectSlot(context.Background(), tc.input)
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("expected %v, got %v", tc.wantErr, err)
			}
		})
	}
}

func TestInterviewInteractor_SelectSlot_NarrowsInterviewTime(t *testing.T) {
	slotStart := time.Date(2026, 8, 3, 10, 0, 0, 0, time.UTC)
	slotEnd := slotStart.Add(2 * time.Hour)
	proposal := &interview.Proposal{
		ID: "prop-1", ApplicationID: "app-1", CompanyID: "co-1",
		CandidateID: "cand-1", Status: "pending",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	slot := &interview.Slot{ID: "slot-1", ProposalID: "prop-1", StartTime: slotStart, EndTime: slotEnd}

	proposalRepo, slotRepo, ivRepo, convRepo := selectSlotFixture(proposal, slot)
	var slotStatuses []string
	slotRepo.updateStatusFn = func(_ context.Context, _, status string) error {
		slotStatuses = append(slotStatuses, status)
		return nil
	}
	rejectCalled := 0
	slotRepo.rejectOthersFn = func(_ context.Context, proposalID, selectedID string) error {
		rejectCalled++
		if proposalID != "prop-1" || selectedID != "slot-1" {
			t.Errorf("RejectOthers got (%s, %s)", proposalID, selectedID)
		}
		return nil
	}
	var proposalStatus string
	proposalRepo.updateStatusFn = func(_ context.Context, _, status string) error {
		proposalStatus = status
		return nil
	}
	var confirmMsg *messaging.Message
	msgRepo := &messageRepoStub{
		createFn: func(_ context.Context, m *messaging.Message) (*messaging.Message, error) {
			confirmMsg = m
			return m, nil
		},
	}

	it := newInterviewInteractor(proposalRepo, slotRepo, ivRepo, convRepo, msgRepo, &interviewQueryStub{})

	narrowStart := slotStart.Add(30 * time.Minute)
	narrowEnd := narrowStart.Add(45 * time.Minute)
	iv, err := it.SelectSlot(context.Background(), interview.SelectSlotInput{
		ProposalID: "prop-1", SlotID: "slot-1", CandidateID: "cand-1",
		StartTime: &narrowStart, EndTime: &narrowEnd,
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if !iv.StartTime.Equal(narrowStart) || !iv.EndTime.Equal(narrowEnd) {
		t.Errorf("interview should use the narrowed range, got %v-%v", iv.StartTime, iv.EndTime)
	}
	if iv.Status != "scheduled" || iv.Title != "面接" {
		t.Errorf("unexpected interview: %+v", iv)
	}
	if len(slotStatuses) != 1 || slotStatuses[0] != "selected" || rejectCalled != 1 {
		t.Errorf("selected slot should be marked and the rest rejected: statuses=%v reject=%d", slotStatuses, rejectCalled)
	}
	if proposalStatus != "confirmed" {
		t.Errorf("proposal should be confirmed, got %q", proposalStatus)
	}
	if confirmMsg == nil || confirmMsg.MessageType != "interview_confirmed" || confirmMsg.SenderType != "system" {
		t.Errorf("confirmation message should be sent as system, got %+v", confirmMsg)
	}
}

func TestInterviewInteractor_SelectSlot_MissingConversationStillSucceeds(t *testing.T) {
	slotStart := time.Date(2026, 8, 3, 10, 0, 0, 0, time.UTC)
	proposal := &interview.Proposal{
		ID: "prop-1", CandidateID: "cand-1", Status: "pending",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	slot := &interview.Slot{ID: "slot-1", ProposalID: "prop-1", StartTime: slotStart, EndTime: slotStart.Add(time.Hour)}

	proposalRepo, slotRepo, ivRepo, convRepo := selectSlotFixture(proposal, slot)
	convRepo.getByCompanyAndCandidateFn = func(_ context.Context, _, _ string) (*messaging.Conversation, error) {
		// 実リポジトリの契約に合わせる（会話なし = domainerr.ErrNotFound）
		return nil, domainerr.ErrNotFound
	}
	msgRepo := &messageRepoStub{
		createFn: func(_ context.Context, _ *messaging.Message) (*messaging.Message, error) {
			t.Fatal("no message should be sent when the conversation is missing")
			return nil, nil
		},
	}

	it := newInterviewInteractor(proposalRepo, slotRepo, ivRepo, convRepo, msgRepo, &interviewQueryStub{})

	iv, err := it.SelectSlot(context.Background(), interview.SelectSlotInput{
		ProposalID: "prop-1", SlotID: "slot-1", CandidateID: "cand-1",
	})
	if err != nil || iv == nil {
		t.Fatalf("selection should succeed without a conversation, got iv=%v err=%v", iv, err)
	}
}

func TestInterviewInteractor_CancelInterview_Authorization(t *testing.T) {
	scheduled := func() *interview.Interview {
		return &interview.Interview{ID: "iv-1", CompanyID: "co-1", CandidateID: "cand-1", Status: "scheduled"}
	}

	cases := []struct {
		name      string
		iv        *interview.Interview
		companyID string
		userID    string
		wantErr   error
	}{
		{name: "interview not found", companyID: "co-1", wantErr: interview.ErrInterviewNotFound},
		{name: "other company", iv: scheduled(), companyID: "co-other", wantErr: port.ErrForbidden},
		{name: "other candidate", iv: scheduled(), userID: "cand-other", wantErr: port.ErrForbidden},
		{name: "no actor", iv: scheduled(), wantErr: interview.ErrCancelUnauthorized},
		{
			name: "not scheduled",
			iv: func() *interview.Interview {
				iv := scheduled()
				iv.Status = "cancelled"
				return iv
			}(),
			companyID: "co-1",
			wantErr:   interview.ErrInterviewNotScheduled,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ivRepo := &interviewRepoStub{
				getByIDFn: func(_ context.Context, _ string) (*interview.Interview, error) {
					if tc.iv == nil {
						return nil, errors.New("no rows")
					}
					return tc.iv, nil
				},
			}
			it := newInterviewInteractor(&interviewProposalRepoStub{}, &interviewSlotRepoStub{}, ivRepo, &conversationRepoStub{}, &messageRepoStub{}, &interviewQueryStub{})
			err := it.CancelInterview(context.Background(), "iv-1", tc.companyID, tc.userID)
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("expected %v, got %v", tc.wantErr, err)
			}
		})
	}
}

func TestInterviewInteractor_CancelInterview_SenderReflectsActor(t *testing.T) {
	cases := []struct {
		name           string
		companyID      string
		userID         string
		wantSenderType string
		wantSenderID   string
	}{
		{name: "company cancels", companyID: "co-1", wantSenderType: "company", wantSenderID: "co-1"},
		{name: "candidate cancels", userID: "cand-1", wantSenderType: "candidate", wantSenderID: "cand-1"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ivRepo := &interviewRepoStub{
				getByIDFn: func(_ context.Context, _ string) (*interview.Interview, error) {
					return &interview.Interview{ID: "iv-1", CompanyID: "co-1", CandidateID: "cand-1", Status: "scheduled"}, nil
				},
			}
			var ivStatus string
			ivRepo.updateStatusFn = func(_ context.Context, _, status string) error {
				ivStatus = status
				return nil
			}
			convRepo := &conversationRepoStub{
				getByCompanyAndCandidateFn: func(_ context.Context, _, _ string) (*messaging.Conversation, error) {
					return &messaging.Conversation{ID: "conv-1"}, nil
				},
			}
			var cancelMsg *messaging.Message
			msgRepo := &messageRepoStub{
				createFn: func(_ context.Context, m *messaging.Message) (*messaging.Message, error) {
					cancelMsg = m
					return m, nil
				},
			}
			it := newInterviewInteractor(&interviewProposalRepoStub{}, &interviewSlotRepoStub{}, ivRepo, convRepo, msgRepo, &interviewQueryStub{})

			if err := it.CancelInterview(context.Background(), "iv-1", tc.companyID, tc.userID); err != nil {
				t.Fatalf("unexpected err: %v", err)
			}
			if ivStatus != "cancelled" {
				t.Errorf("interview should be cancelled, got %q", ivStatus)
			}
			if cancelMsg.SenderType != tc.wantSenderType || cancelMsg.SenderID != tc.wantSenderID {
				t.Errorf("cancel message sender = (%s, %s), want (%s, %s)",
					cancelMsg.SenderType, cancelMsg.SenderID, tc.wantSenderType, tc.wantSenderID)
			}
			if cancelMsg.MessageType != "interview_cancelled" {
				t.Errorf("unexpected message type %q", cancelMsg.MessageType)
			}
		})
	}
}

func TestInterviewInteractor_ListByCandidate_SkipsProposalOnSlotError(t *testing.T) {
	proposalRepo := &interviewProposalRepoStub{
		listPendingByCandidateFn: func(_ context.Context, _ string) ([]*interview.Proposal, error) {
			return []*interview.Proposal{{ID: "prop-ok", CompanyID: "co-1"}, {ID: "prop-bad", CompanyID: "co-1"}}, nil
		},
	}
	slotRepo := &interviewSlotRepoStub{
		listByProposalFn: func(_ context.Context, proposalID string) ([]*interview.Slot, error) {
			if proposalID == "prop-bad" {
				return nil, errors.New("boom")
			}
			return []*interview.Slot{{ID: "slot-1", ProposalID: proposalID}}, nil
		},
	}
	ivRepo := &interviewRepoStub{
		listByCandidateFn: func(_ context.Context, _ string) ([]*interview.Interview, error) {
			return nil, nil
		},
	}
	it := newInterviewInteractor(proposalRepo, slotRepo, ivRepo, &conversationRepoStub{}, &messageRepoStub{}, &interviewQueryStub{})

	_, pending, err := it.ListByCandidate(context.Background(), "cand-1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(pending) != 1 || pending[0].ID != "prop-ok" {
		t.Fatalf("proposal with failing slots should be skipped, got %+v", pending)
	}
}
