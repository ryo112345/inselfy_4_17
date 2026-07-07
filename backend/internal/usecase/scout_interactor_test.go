package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/domain/notification"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// scoutDeps bundles the stubs so each test only sets what it cares about;
// newScoutInteractor fills the rest with safe defaults.
type scoutDeps struct {
	msgRepo         *scoutMessageRepoStub
	creditRepo      *scoutCreditRepoStub
	ledgerRepo      *scoutLedgerRepoStub
	replyRepo       *scoutReplyRepoStub
	settingsRepo    *scoutSettingsRepoStub
	notifRepo       *notificationRepoStub
	userRepo        *userRepoStub
	convRepo        *conversationRepoStub
	convMsgRepo     *messageRepoStub
	participantRepo *participantRepoStub
}

func newScoutInteractor(d *scoutDeps) *usecase.ScoutInteractor {
	if d.msgRepo == nil {
		d.msgRepo = &scoutMessageRepoStub{}
	}
	if d.creditRepo == nil {
		d.creditRepo = &scoutCreditRepoStub{
			getOrCreateFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
				return &scout.ScoutCredit{CompanyID: companyID, Balance: 10}, nil
			},
		}
	}
	if d.ledgerRepo == nil {
		d.ledgerRepo = &scoutLedgerRepoStub{}
	}
	if d.replyRepo == nil {
		d.replyRepo = &scoutReplyRepoStub{}
	}
	if d.settingsRepo == nil {
		d.settingsRepo = &scoutSettingsRepoStub{}
	}
	if d.notifRepo == nil {
		d.notifRepo = &notificationRepoStub{}
	}
	if d.userRepo == nil {
		d.userRepo = &userRepoStub{
			getByIDFn: func(_ context.Context, id string) (*user.User, error) {
				return &user.User{ID: id, Name: "山田太郎"}, nil
			},
		}
	}
	if d.convRepo == nil {
		d.convRepo = &conversationRepoStub{
			getByCompanyAndCandidateFn: func(_ context.Context, _, _ string) (*messaging.Conversation, error) {
				return nil, domainerr.ErrNotFound
			},
		}
	}
	if d.convMsgRepo == nil {
		d.convMsgRepo = &messageRepoStub{}
	}
	if d.participantRepo == nil {
		d.participantRepo = &participantRepoStub{}
	}
	return usecase.NewScoutInteractor(
		d.msgRepo, d.creditRepo, d.ledgerRepo, d.replyRepo, d.settingsRepo,
		d.notifRepo, d.userRepo, d.convRepo, d.convMsgRepo, d.participantRepo,
		inlineTxManager{},
	)
}

// sendableMsgRepo returns a message repo where Send can succeed: no active or
// prior scout, and Create/GetByID echo the created message back.
func sendableMsgRepo(created **scout.ScoutMessage) *scoutMessageRepoStub {
	return &scoutMessageRepoStub{
		createFn: func(_ context.Context, m *scout.ScoutMessage) (*scout.ScoutMessage, error) {
			out := *m
			out.ID = "scout-1"
			*created = &out
			return &out, nil
		},
		getByIDFn: func(_ context.Context, id string) (*scout.ScoutMessageWithNames, error) {
			return &scout.ScoutMessageWithNames{ScoutMessage: **created, CandidateName: "山田太郎"}, nil
		},
	}
}

func TestScoutInteractor_Send_Success(t *testing.T) {
	ctx := context.Background()

	var created *scout.ScoutMessage
	msgRepo := sendableMsgRepo(&created)
	creditRepo := &scoutCreditRepoStub{
		getOrCreateFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
			return &scout.ScoutCredit{CompanyID: companyID, Balance: 5}, nil
		},
		deductFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
			return &scout.ScoutCredit{CompanyID: companyID, Balance: 4}, nil
		},
	}
	ledgerRepo := &scoutLedgerRepoStub{}
	notifRepo := &notificationRepoStub{}

	it := newScoutInteractor(&scoutDeps{
		msgRepo: msgRepo, creditRepo: creditRepo, ledgerRepo: ledgerRepo, notifRepo: notifRepo,
	})

	out, err := it.Send(ctx, scout.SendScoutInput{
		CompanyID:   "co-1",
		CandidateID: "cand-1",
		Subject:     "  カジュアル面談のお誘い  ",
		Body:        "{{candidate_name}}様、ぜひお話しさせてください。",
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if created.Status != scout.StatusSent {
		t.Errorf("new scout should be sent, got %q", created.Status)
	}
	if created.Subject != "カジュアル面談のお誘い" {
		t.Errorf("subject should be trimmed, got %q", created.Subject)
	}
	if created.Body != "山田太郎様、ぜひお話しさせてください。" {
		t.Errorf("template vars should be rendered, got %q", created.Body)
	}
	if created.SentAt == nil || created.ExpiresAt == nil {
		t.Errorf("sent_at and expires_at should be set: %+v", created)
	}
	if created.ResendCount != 0 {
		t.Errorf("first scout should have resend_count 0, got %d", created.ResendCount)
	}
	if len(ledgerRepo.entries) != 1 {
		t.Fatalf("expected 1 ledger entry, got %d", len(ledgerRepo.entries))
	}
	e := ledgerRepo.entries[0]
	if e.Delta != -1 || e.Reason != "send" || e.BalanceAfter != 4 {
		t.Errorf("ledger should record the deduction: %+v", e)
	}
	if len(notifRepo.created) != 1 {
		t.Fatalf("expected 1 notification, got %d", len(notifRepo.created))
	}
	n := notifRepo.created[0]
	if n.Type != notification.TypeScoutReceived || n.UserID == nil || *n.UserID != "cand-1" {
		t.Errorf("candidate should be notified of the scout: %+v", n)
	}
	if out.ID != "scout-1" {
		t.Errorf("should return the persisted scout, got %+v", out)
	}
}

func TestScoutInteractor_Send_ValidationError(t *testing.T) {
	it := newScoutInteractor(&scoutDeps{})
	_, err := it.Send(context.Background(), scout.SendScoutInput{
		CompanyID:   "co-1",
		CandidateID: "cand-1",
		Subject:     "   ",
		Body:        "本文",
	})
	if !errors.Is(err, scout.ErrSubjectRequired) {
		t.Errorf("blank subject should be rejected, got %v", err)
	}
}

func TestScoutInteractor_Send_ScoutingDisabled(t *testing.T) {
	settingsRepo := &scoutSettingsRepoStub{
		getByUserIDFn: func(_ context.Context, userID string) (*scout.UserScoutSettings, error) {
			return &scout.UserScoutSettings{UserID: userID, AcceptingScouts: false}, nil
		},
	}
	it := newScoutInteractor(&scoutDeps{settingsRepo: settingsRepo})
	_, err := it.Send(context.Background(), scout.SendScoutInput{
		CompanyID: "co-1", CandidateID: "cand-1", Subject: "件名", Body: "本文",
	})
	if !errors.Is(err, scout.ErrScoutingDisabled) {
		t.Errorf("scout to a declining candidate should fail, got %v", err)
	}
}

func TestScoutInteractor_Send_QualityRestrictedCredit(t *testing.T) {
	creditRepo := &scoutCreditRepoStub{
		getOrCreateFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
			return &scout.ScoutCredit{CompanyID: companyID, Balance: 5, QualityRestricted: true}, nil
		},
	}
	it := newScoutInteractor(&scoutDeps{creditRepo: creditRepo})
	_, err := it.Send(context.Background(), scout.SendScoutInput{
		CompanyID: "co-1", CandidateID: "cand-1", Subject: "件名", Body: "本文",
	})
	if !errors.Is(err, scout.ErrQualityRestricted) {
		t.Errorf("permanently restricted company must not send, got %v", err)
	}
}

func TestScoutInteractor_Send_TemporarilyRestricted(t *testing.T) {
	started := time.Now().Add(-24 * time.Hour)
	creditRepo := &scoutCreditRepoStub{
		getOrCreateFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
			return &scout.ScoutCredit{CompanyID: companyID, Balance: 5, RestrictionStartedAt: &started}, nil
		},
	}
	it := newScoutInteractor(&scoutDeps{creditRepo: creditRepo})
	_, err := it.Send(context.Background(), scout.SendScoutInput{
		CompanyID: "co-1", CandidateID: "cand-1", Subject: "件名", Body: "本文",
	})
	if !errors.Is(err, scout.ErrQualityRestricted) {
		t.Errorf("temporarily restricted company must not send, got %v", err)
	}
	if len(creditRepo.transitions) != 0 {
		t.Errorf("mid-restriction evaluation should not change state, got %v", creditRepo.transitions)
	}
}

func TestScoutInteractor_Send_WarningStillAllowsSending(t *testing.T) {
	var created *scout.ScoutMessage
	msgRepo := sendableMsgRepo(&created)
	// 50 sent / 0 replied in 14 days crosses the quality threshold.
	msgRepo.countSentLastNDaysFn = func(_ context.Context, _ string, days int) (int, error) {
		return 50, nil
	}
	creditRepo := &scoutCreditRepoStub{
		getOrCreateFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
			return &scout.ScoutCredit{CompanyID: companyID, Balance: 5}, nil
		},
		deductFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
			return &scout.ScoutCredit{CompanyID: companyID, Balance: 4}, nil
		},
	}
	it := newScoutInteractor(&scoutDeps{msgRepo: msgRepo, creditRepo: creditRepo})

	_, err := it.Send(context.Background(), scout.SendScoutInput{
		CompanyID: "co-1", CandidateID: "cand-1", Subject: "件名", Body: "本文",
	})
	if err != nil {
		t.Fatalf("warning level should not block sending: %v", err)
	}
	if len(creditRepo.transitions) != 1 || creditRepo.transitions[0] != "set_warning" {
		t.Errorf("low reply rate should start the warning period, got %v", creditRepo.transitions)
	}
}

func TestScoutInteractor_Send_DuplicateActive(t *testing.T) {
	msgRepo := &scoutMessageRepoStub{
		getActiveByCompanyAndCandidateFn: func(_ context.Context, _, _ string) (*scout.ScoutMessage, error) {
			return &scout.ScoutMessage{ID: "scout-0", Status: scout.StatusSent}, nil
		},
	}
	it := newScoutInteractor(&scoutDeps{msgRepo: msgRepo})
	_, err := it.Send(context.Background(), scout.SendScoutInput{
		CompanyID: "co-1", CandidateID: "cand-1", Subject: "件名", Body: "本文",
	})
	if !errors.Is(err, scout.ErrDuplicateScout) {
		t.Errorf("active scout to the same candidate should block resend, got %v", err)
	}
}

func TestScoutInteractor_Send_Resend(t *testing.T) {
	tests := []struct {
		name            string
		latest          *scout.ScoutMessage
		wantErr         error
		wantResendCount int16
	}{
		{
			name:            "expired scout can be resent once",
			latest:          &scout.ScoutMessage{Status: scout.StatusExpired, ResendCount: 0},
			wantResendCount: 1,
		},
		{
			name:    "resend limit reached",
			latest:  &scout.ScoutMessage{Status: scout.StatusDeclined, ResendCount: 1},
			wantErr: scout.ErrResendLimitReached,
		},
		{
			name:    "replied scout cannot be resent",
			latest:  &scout.ScoutMessage{Status: scout.StatusReplied, ResendCount: 0},
			wantErr: scout.ErrDuplicateScout,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var created *scout.ScoutMessage
			msgRepo := sendableMsgRepo(&created)
			msgRepo.getLatestByCompanyAndCandidateFn = func(_ context.Context, _, _ string) (*scout.ScoutMessage, error) {
				return tt.latest, nil
			}
			creditRepo := &scoutCreditRepoStub{
				getOrCreateFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
					return &scout.ScoutCredit{CompanyID: companyID, Balance: 5}, nil
				},
				deductFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
					return &scout.ScoutCredit{CompanyID: companyID, Balance: 4}, nil
				},
			}
			it := newScoutInteractor(&scoutDeps{msgRepo: msgRepo, creditRepo: creditRepo})

			_, err := it.Send(context.Background(), scout.SendScoutInput{
				CompanyID: "co-1", CandidateID: "cand-1", Subject: "件名", Body: "本文",
			})
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("want %v, got %v", tt.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected err: %v", err)
			}
			if created.ResendCount != tt.wantResendCount {
				t.Errorf("resend count should increment, want %d got %d", tt.wantResendCount, created.ResendCount)
			}
		})
	}
}

func TestScoutInteractor_Send_InsufficientCredits(t *testing.T) {
	for _, tt := range []struct {
		name     string
		deductFn func(ctx context.Context, companyID string) (*scout.ScoutCredit, error)
	}{
		{
			name: "deduct reports not found",
			deductFn: func(_ context.Context, _ string) (*scout.ScoutCredit, error) {
				return nil, domainerr.ErrNotFound
			},
		},
		{
			name: "deduct returns no credit row",
			deductFn: func(_ context.Context, _ string) (*scout.ScoutCredit, error) {
				return nil, nil
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var created *scout.ScoutMessage
			creditRepo := &scoutCreditRepoStub{
				getOrCreateFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
					return &scout.ScoutCredit{CompanyID: companyID, Balance: 0}, nil
				},
				deductFn: tt.deductFn,
			}
			it := newScoutInteractor(&scoutDeps{msgRepo: sendableMsgRepo(&created), creditRepo: creditRepo})

			_, err := it.Send(context.Background(), scout.SendScoutInput{
				CompanyID: "co-1", CandidateID: "cand-1", Subject: "件名", Body: "本文",
			})
			if !errors.Is(err, scout.ErrInsufficientCredits) {
				t.Errorf("want ErrInsufficientCredits, got %v", err)
			}
		})
	}
}

func TestScoutInteractor_GetQualityScore(t *testing.T) {
	now := time.Now()
	warned15DaysAgo := now.Add(-15 * 24 * time.Hour)
	restricted31DaysAgo := now.Add(-31 * 24 * time.Hour)

	tests := []struct {
		name            string
		credit          scout.ScoutCredit
		sent            map[int]int // lookback days -> count
		replied         map[int]int
		wantLevel       scout.QualityLevel
		wantTransitions []string
	}{
		{
			name:      "too few samples stays good",
			sent:      map[int]int{14: 10},
			replied:   map[int]int{14: 0},
			wantLevel: scout.QualityGood,
		},
		{
			name:            "low reply rate starts warning",
			sent:            map[int]int{14: 50},
			replied:         map[int]int{14: 2}, // 4% < 13%
			wantLevel:       scout.QualityWarning,
			wantTransitions: []string{"set_warning"},
		},
		{
			name:            "recovered rate clears warning",
			credit:          scout.ScoutCredit{WarningStartedAt: &warned15DaysAgo},
			sent:            map[int]int{14: 50},
			replied:         map[int]int{14: 10}, // 20% >= 13%
			wantLevel:       scout.QualityGood,
			wantTransitions: []string{"clear_warning"},
		},
		{
			name:            "still low after warning deadline becomes temporary restriction",
			credit:          scout.ScoutCredit{WarningStartedAt: &warned15DaysAgo},
			sent:            map[int]int{14: 50, 20: 60},
			replied:         map[int]int{14: 0, 20: 0},
			wantLevel:       scout.QualityTemporarilyRestricted,
			wantTransitions: []string{"set_temp_restriction"},
		},
		{
			name:            "still low after temporary restriction becomes permanent",
			credit:          scout.ScoutCredit{RestrictionStartedAt: &restricted31DaysAgo},
			sent:            map[int]int{14: 50},
			replied:         map[int]int{14: 0},
			wantLevel:       scout.QualityRestricted,
			wantTransitions: []string{"set_restricted"},
		},
		{
			name:      "permanently restricted flag wins",
			credit:    scout.ScoutCredit{QualityRestricted: true},
			sent:      map[int]int{14: 50},
			replied:   map[int]int{14: 50},
			wantLevel: scout.QualityRestricted,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msgRepo := &scoutMessageRepoStub{
				countSentLastNDaysFn: func(_ context.Context, _ string, days int) (int, error) {
					return tt.sent[days], nil
				},
				countRepliedLastNDaysFn: func(_ context.Context, _ string, days int) (int, error) {
					return tt.replied[days], nil
				},
			}
			creditRepo := &scoutCreditRepoStub{
				getOrCreateFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
					c := tt.credit
					c.CompanyID = companyID
					return &c, nil
				},
			}
			it := newScoutInteractor(&scoutDeps{msgRepo: msgRepo, creditRepo: creditRepo})

			score, err := it.GetQualityScore(context.Background(), "co-1")
			if err != nil {
				t.Fatalf("unexpected err: %v", err)
			}
			if score.Level != tt.wantLevel {
				t.Errorf("want level %q, got %q", tt.wantLevel, score.Level)
			}
			if len(tt.wantTransitions) == 0 {
				if len(creditRepo.transitions) != 0 {
					t.Errorf("expected no state change, got %v", creditRepo.transitions)
				}
				return
			}
			if len(creditRepo.transitions) != len(tt.wantTransitions) {
				t.Fatalf("want transitions %v, got %v", tt.wantTransitions, creditRepo.transitions)
			}
			for i, want := range tt.wantTransitions {
				if creditRepo.transitions[i] != want {
					t.Errorf("want transitions %v, got %v", tt.wantTransitions, creditRepo.transitions)
				}
			}
		})
	}
}

func respondableMsgRepo(status scout.Status, statusChanges *[]scout.Status) *scoutMessageRepoStub {
	return &scoutMessageRepoStub{
		getByIDFn: func(_ context.Context, id string) (*scout.ScoutMessageWithNames, error) {
			return &scout.ScoutMessageWithNames{
				ScoutMessage: scout.ScoutMessage{
					ID: id, CompanyID: "co-1", CandidateID: "cand-1",
					Subject: "件名", Body: "本文", Status: status,
				},
			}, nil
		},
		updateStatusFn: func(_ context.Context, _ string, s scout.Status) error {
			*statusChanges = append(*statusChanges, s)
			return nil
		},
	}
}

func TestScoutInteractor_Respond_InterestedCreatesConversation(t *testing.T) {
	ctx := context.Background()

	var statusChanges []scout.Status
	msgRepo := respondableMsgRepo(scout.StatusOpened, &statusChanges)
	creditRepo := &scoutCreditRepoStub{
		refundFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
			return &scout.ScoutCredit{CompanyID: companyID, Balance: 6}, nil
		},
	}
	ledgerRepo := &scoutLedgerRepoStub{}
	notifRepo := &notificationRepoStub{}

	var participants []*messaging.ConversationParticipant
	participantRepo := &participantRepoStub{
		createFn: func(_ context.Context, p *messaging.ConversationParticipant) error {
			participants = append(participants, p)
			return nil
		},
	}
	lastMessageUpdated := 0
	convRepo := &conversationRepoStub{
		getByCompanyAndCandidateFn: func(_ context.Context, _, _ string) (*messaging.Conversation, error) {
			return nil, domainerr.ErrNotFound
		},
		createFn: func(_ context.Context, conv *messaging.Conversation) (*messaging.Conversation, error) {
			out := *conv
			out.ID = "conv-1"
			return &out, nil
		},
		updateLastMessageAtFn: func(_ context.Context, _ string) error {
			lastMessageUpdated++
			return nil
		},
	}
	var messages []*messaging.Message
	convMsgRepo := &messageRepoStub{
		createFn: func(_ context.Context, m *messaging.Message) (*messaging.Message, error) {
			messages = append(messages, m)
			return m, nil
		},
	}

	it := newScoutInteractor(&scoutDeps{
		msgRepo: msgRepo, creditRepo: creditRepo, ledgerRepo: ledgerRepo, notifRepo: notifRepo,
		convRepo: convRepo, convMsgRepo: convMsgRepo, participantRepo: participantRepo,
	})

	if err := it.Respond(ctx, "cand-1", "scout-1", scout.ResponseInterested); err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(statusChanges) != 1 || statusChanges[0] != scout.StatusInterested {
		t.Errorf("scout should move to interested, got %v", statusChanges)
	}
	if len(ledgerRepo.entries) != 1 || ledgerRepo.entries[0].Delta != 1 || ledgerRepo.entries[0].Reason != "response_refund" {
		t.Errorf("response should refund one credit: %+v", ledgerRepo.entries)
	}
	if len(notifRepo.created) != 1 || notifRepo.created[0].Type != notification.TypeScoutInterested {
		t.Errorf("company should be notified of interest: %+v", notifRepo.created)
	}
	if len(participants) != 2 {
		t.Errorf("new conversation should register both participants, got %d", len(participants))
	}
	if len(messages) != 2 {
		t.Fatalf("scout body and system message should be posted, got %d", len(messages))
	}
	if messages[0].SenderType != "company" || messages[0].Body != "件名\n\n本文" {
		t.Errorf("first message should carry the scout content: %+v", messages[0])
	}
	if messages[1].SenderType != "system" || messages[1].Body != "興味ありと回答しました" {
		t.Errorf("second message should be the interested system note: %+v", messages[1])
	}
	if lastMessageUpdated != 1 {
		t.Errorf("conversation last_message_at should be touched once, got %d", lastMessageUpdated)
	}
}

func TestScoutInteractor_Respond_DeclinedReusesConversation(t *testing.T) {
	var statusChanges []scout.Status
	msgRepo := respondableMsgRepo(scout.StatusSent, &statusChanges)
	creditRepo := &scoutCreditRepoStub{
		refundFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
			return &scout.ScoutCredit{CompanyID: companyID, Balance: 6}, nil
		},
	}
	notifRepo := &notificationRepoStub{}
	convCreated := 0
	convRepo := &conversationRepoStub{
		getByCompanyAndCandidateFn: func(_ context.Context, _, _ string) (*messaging.Conversation, error) {
			return &messaging.Conversation{ID: "conv-9"}, nil
		},
		createFn: func(_ context.Context, conv *messaging.Conversation) (*messaging.Conversation, error) {
			convCreated++
			return conv, nil
		},
	}
	var messages []*messaging.Message
	convMsgRepo := &messageRepoStub{
		createFn: func(_ context.Context, m *messaging.Message) (*messaging.Message, error) {
			messages = append(messages, m)
			return m, nil
		},
	}
	participantCreated := 0
	participantRepo := &participantRepoStub{
		createFn: func(_ context.Context, _ *messaging.ConversationParticipant) error {
			participantCreated++
			return nil
		},
	}

	it := newScoutInteractor(&scoutDeps{
		msgRepo: msgRepo, creditRepo: creditRepo, notifRepo: notifRepo,
		convRepo: convRepo, convMsgRepo: convMsgRepo, participantRepo: participantRepo,
	})

	if err := it.Respond(context.Background(), "cand-1", "scout-1", scout.ResponseDeclined); err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(statusChanges) != 1 || statusChanges[0] != scout.StatusDeclined {
		t.Errorf("scout should move to declined, got %v", statusChanges)
	}
	if convCreated != 0 || participantCreated != 0 {
		t.Errorf("existing conversation should be reused (created %d convs, %d participants)", convCreated, participantCreated)
	}
	if len(messages) != 2 || messages[1].Body != "辞退されました" {
		t.Errorf("declined response should post the decline system note: %+v", messages)
	}
	if len(notifRepo.created) != 1 || notifRepo.created[0].Type != notification.TypeScoutDeclined {
		t.Errorf("company should be notified of decline: %+v", notifRepo.created)
	}
	if messages[0].ConversationID != "conv-9" {
		t.Errorf("messages should go to the existing conversation, got %q", messages[0].ConversationID)
	}
}

func TestScoutInteractor_Respond_Guards(t *testing.T) {
	var statusChanges []scout.Status

	t.Run("not owner", func(t *testing.T) {
		it := newScoutInteractor(&scoutDeps{msgRepo: respondableMsgRepo(scout.StatusSent, &statusChanges)})
		err := it.Respond(context.Background(), "someone-else", "scout-1", scout.ResponseInterested)
		if !errors.Is(err, scout.ErrNotOwner) {
			t.Errorf("other candidates must not respond, got %v", err)
		}
	})

	t.Run("already responded", func(t *testing.T) {
		it := newScoutInteractor(&scoutDeps{msgRepo: respondableMsgRepo(scout.StatusInterested, &statusChanges)})
		err := it.Respond(context.Background(), "cand-1", "scout-1", scout.ResponseDeclined)
		if !errors.Is(err, scout.ErrNotSentOrOpened) {
			t.Errorf("responding twice should fail, got %v", err)
		}
	})

	if len(statusChanges) != 0 {
		t.Errorf("guard failures must not change status, got %v", statusChanges)
	}
}

func TestScoutInteractor_CandidateReply_FirstReplyRefunds(t *testing.T) {
	markedReplied := 0
	msgRepo := &scoutMessageRepoStub{
		getByIDFn: func(_ context.Context, id string) (*scout.ScoutMessageWithNames, error) {
			return &scout.ScoutMessageWithNames{
				ScoutMessage: scout.ScoutMessage{ID: id, CompanyID: "co-1", CandidateID: "cand-1", Status: scout.StatusOpened},
			}, nil
		},
		markRepliedFn: func(_ context.Context, _ string) error {
			markedReplied++
			return nil
		},
	}
	creditRepo := &scoutCreditRepoStub{
		refundFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
			return &scout.ScoutCredit{CompanyID: companyID, Balance: 6}, nil
		},
	}
	ledgerRepo := &scoutLedgerRepoStub{}
	replyRepo := &scoutReplyRepoStub{}
	notifRepo := &notificationRepoStub{}

	it := newScoutInteractor(&scoutDeps{
		msgRepo: msgRepo, creditRepo: creditRepo, ledgerRepo: ledgerRepo,
		replyRepo: replyRepo, notifRepo: notifRepo,
	})

	if err := it.CandidateReply(context.Background(), "cand-1", "scout-1", " 返信します "); err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if markedReplied != 1 {
		t.Errorf("first reply should mark the scout replied, ran %d times", markedReplied)
	}
	if len(ledgerRepo.entries) != 1 || ledgerRepo.entries[0].Delta != 1 || ledgerRepo.entries[0].Reason != "reply_refund" {
		t.Errorf("first reply should refund one credit: %+v", ledgerRepo.entries)
	}
	if len(replyRepo.created) != 1 {
		t.Fatalf("reply should be persisted, got %d", len(replyRepo.created))
	}
	r := replyRepo.created[0]
	if r.SenderType != "candidate" || r.SenderID != "cand-1" || r.Body != "返信します" {
		t.Errorf("reply should be trimmed and attributed to the candidate: %+v", r)
	}
	if len(notifRepo.created) != 1 || notifRepo.created[0].Type != notification.TypeScoutReplied {
		t.Errorf("company should be notified of the reply: %+v", notifRepo.created)
	}
}

func TestScoutInteractor_CandidateReply_SubsequentReplyDoesNotRefund(t *testing.T) {
	markedReplied := 0
	refunded := 0
	msgRepo := &scoutMessageRepoStub{
		getByIDFn: func(_ context.Context, id string) (*scout.ScoutMessageWithNames, error) {
			return &scout.ScoutMessageWithNames{
				ScoutMessage: scout.ScoutMessage{ID: id, CompanyID: "co-1", CandidateID: "cand-1", Status: scout.StatusReplied},
			}, nil
		},
		markRepliedFn: func(_ context.Context, _ string) error {
			markedReplied++
			return nil
		},
	}
	creditRepo := &scoutCreditRepoStub{
		refundFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
			refunded++
			return &scout.ScoutCredit{CompanyID: companyID, Balance: 6}, nil
		},
	}
	ledgerRepo := &scoutLedgerRepoStub{}
	replyRepo := &scoutReplyRepoStub{}

	it := newScoutInteractor(&scoutDeps{
		msgRepo: msgRepo, creditRepo: creditRepo, ledgerRepo: ledgerRepo, replyRepo: replyRepo,
	})

	if err := it.CandidateReply(context.Background(), "cand-1", "scout-1", "追伸です"); err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if markedReplied != 0 || refunded != 0 || len(ledgerRepo.entries) != 0 {
		t.Errorf("second reply must not refund again (marked=%d refunded=%d ledger=%d)",
			markedReplied, refunded, len(ledgerRepo.entries))
	}
	if len(replyRepo.created) != 1 {
		t.Errorf("reply should still be persisted, got %d", len(replyRepo.created))
	}
}

func TestScoutInteractor_BulkRespond_SkipsAlreadyResponded(t *testing.T) {
	statuses := map[string]scout.Status{
		"scout-1": scout.StatusSent,
		"scout-2": scout.StatusInterested, // already responded: skipped, not an error
		"scout-3": scout.StatusOpened,
	}
	var responded []string
	msgRepo := &scoutMessageRepoStub{
		getByIDFn: func(_ context.Context, id string) (*scout.ScoutMessageWithNames, error) {
			return &scout.ScoutMessageWithNames{
				ScoutMessage: scout.ScoutMessage{ID: id, CompanyID: "co-1", CandidateID: "cand-1", Status: statuses[id]},
			}, nil
		},
		updateStatusFn: func(_ context.Context, id string, _ scout.Status) error {
			responded = append(responded, id)
			return nil
		},
	}
	creditRepo := &scoutCreditRepoStub{
		refundFn: func(_ context.Context, companyID string) (*scout.ScoutCredit, error) {
			return &scout.ScoutCredit{CompanyID: companyID, Balance: 6}, nil
		},
	}
	convRepo := &conversationRepoStub{
		getByCompanyAndCandidateFn: func(_ context.Context, _, _ string) (*messaging.Conversation, error) {
			return &messaging.Conversation{ID: "conv-1"}, nil
		},
	}

	it := newScoutInteractor(&scoutDeps{msgRepo: msgRepo, creditRepo: creditRepo, convRepo: convRepo})

	err := it.BulkDecline(context.Background(), "cand-1", []string{"scout-1", "scout-2", "scout-3"})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(responded) != 2 || responded[0] != "scout-1" || responded[1] != "scout-3" {
		t.Errorf("only pending scouts should be processed, got %v", responded)
	}
}

func TestScoutInteractor_BulkRespond_NotOwnerAborts(t *testing.T) {
	msgRepo := &scoutMessageRepoStub{
		getByIDFn: func(_ context.Context, id string) (*scout.ScoutMessageWithNames, error) {
			return &scout.ScoutMessageWithNames{
				ScoutMessage: scout.ScoutMessage{ID: id, CompanyID: "co-1", CandidateID: "other", Status: scout.StatusSent},
			}, nil
		},
	}
	it := newScoutInteractor(&scoutDeps{msgRepo: msgRepo})
	err := it.BulkRespond(context.Background(), "cand-1", []string{"scout-1"}, scout.ResponseDeclined)
	if !errors.Is(err, scout.ErrNotOwner) {
		t.Errorf("bulk respond must enforce ownership, got %v", err)
	}
}

func TestScoutInteractor_GetReceivedDetail_MarksOpened(t *testing.T) {
	markedOpened := 0
	msgRepo := &scoutMessageRepoStub{
		getByIDFn: func(_ context.Context, id string) (*scout.ScoutMessageWithNames, error) {
			return &scout.ScoutMessageWithNames{
				ScoutMessage: scout.ScoutMessage{ID: id, CompanyID: "co-1", CandidateID: "cand-1", Status: scout.StatusSent},
			}, nil
		},
		markOpenedFn: func(_ context.Context, _ string) error {
			markedOpened++
			return nil
		},
	}
	it := newScoutInteractor(&scoutDeps{msgRepo: msgRepo})

	msg, _, err := it.GetReceivedDetail(context.Background(), "cand-1", "scout-1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if markedOpened != 1 || msg.Status != scout.StatusOpened {
		t.Errorf("first open should mark the scout opened (marked=%d status=%q)", markedOpened, msg.Status)
	}

	_, _, err = it.GetReceivedDetail(context.Background(), "other", "scout-1")
	if !errors.Is(err, scout.ErrNotOwner) {
		t.Errorf("other candidates must not read the scout, got %v", err)
	}
}

func TestScoutInteractor_GetScoutSettings_DefaultsToAccepting(t *testing.T) {
	it := newScoutInteractor(&scoutDeps{}) // settings repo defaults to not found

	s, err := it.GetScoutSettings(context.Background(), "cand-1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if !s.AcceptingScouts || s.UserID != "cand-1" {
		t.Errorf("missing settings should default to accepting scouts: %+v", s)
	}
}

func TestScoutInteractor_GetDashboard_ComputesReplyRate(t *testing.T) {
	msgRepo := &scoutMessageRepoStub{
		countSentLastNDaysFn: func(_ context.Context, _ string, days int) (int, error) {
			if days == 90 {
				return 40, nil
			}
			return 0, nil
		},
		countRepliedLastNDaysFn: func(_ context.Context, _ string, days int) (int, error) {
			if days == 90 {
				return 10, nil
			}
			return 0, nil
		},
		avgReplyDaysFn: func(_ context.Context, _ string) (float64, error) {
			return 2.5, nil
		},
	}
	it := newScoutInteractor(&scoutDeps{msgRepo: msgRepo})

	stats, err := it.GetDashboard(context.Background(), "co-1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if stats.ReplyRate != 25.0 {
		t.Errorf("10/40 should be a 25%% reply rate, got %v", stats.ReplyRate)
	}
	if stats.SentLast90d != 40 || stats.AvgReplyDays != 2.5 {
		t.Errorf("dashboard should surface raw counts: %+v", stats)
	}
	if stats.PendingTotal != 0 {
		t.Errorf("no pending scouts expected, got %d", stats.PendingTotal)
	}
}
