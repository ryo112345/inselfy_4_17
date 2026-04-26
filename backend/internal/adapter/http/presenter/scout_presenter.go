package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type scoutMessageResponse struct {
	ID            string     `json:"id"`
	CompanyID     string     `json:"companyId"`
	CandidateID   string     `json:"candidateId"`
	JobPostingID  *string    `json:"jobPostingId"`
	Subject       string     `json:"subject"`
	Body          string     `json:"body"`
	Status        string     `json:"status"`
	CompanyName   string     `json:"companyName"`
	CandidateName string     `json:"candidateName"`
	JobTitle      *string    `json:"jobTitle"`
	SentAt        *time.Time `json:"sentAt"`
	OpenedAt      *time.Time `json:"openedAt"`
	RepliedAt     *time.Time `json:"repliedAt"`
	ExpiresAt     *time.Time `json:"expiresAt"`
	CreatedAt     time.Time  `json:"createdAt"`
}

type scoutReplyResponse struct {
	ID         string    `json:"id"`
	SenderType string    `json:"senderType"`
	SenderID   string    `json:"senderId"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"createdAt"`
}

type scoutDetailResponse struct {
	Message *scoutMessageResponse `json:"message"`
	Replies []*scoutReplyResponse `json:"replies"`
}

type scoutListResponse struct {
	Items []*scoutMessageResponse `json:"items"`
	Total int                     `json:"total"`
}

type creditsResponse struct {
	Balance          int       `json:"balance"`
	MonthlyAllowance int       `json:"monthlyAllowance"`
	MaxStock         int       `json:"maxStock"`
	LastReplenished  time.Time `json:"lastReplenishedAt"`
}

type qualityScoreResponse struct {
	ReplyRate14d   float64 `json:"replyRate14d"`
	Level          string  `json:"level"`
	SentLast14d    int     `json:"sentLast14d"`
	RepliedLast14d int     `json:"repliedLast14d"`
}

type scoutSettingsResponse struct {
	AcceptingScouts bool      `json:"acceptingScouts"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type ScoutPresenter struct {
	message  *scoutMessageResponse
	list     *scoutListResponse
	detail   *scoutDetailResponse
	credits  *creditsResponse
	quality  *qualityScoreResponse
	settings *scoutSettingsResponse
	ok       bool
}

var _ port.ScoutOutputPort = (*ScoutPresenter)(nil)

func NewScoutPresenter() *ScoutPresenter {
	return &ScoutPresenter{}
}

func (p *ScoutPresenter) PresentScoutMessage(_ context.Context, m *scout.ScoutMessageWithNames) error {
	p.message = toScoutMessageResponse(m)
	return nil
}

func (p *ScoutPresenter) PresentScoutMessages(_ context.Context, msgs []*scout.ScoutMessageWithNames, total int) error {
	items := make([]*scoutMessageResponse, len(msgs))
	for i, m := range msgs {
		items[i] = toScoutMessageResponse(m)
	}
	p.list = &scoutListResponse{Items: items, Total: total}
	return nil
}

func (p *ScoutPresenter) PresentScoutDetail(_ context.Context, m *scout.ScoutMessageWithNames, replies []*scout.ScoutReply) error {
	rr := make([]*scoutReplyResponse, len(replies))
	for i, r := range replies {
		rr[i] = &scoutReplyResponse{
			ID:         r.ID,
			SenderType: r.SenderType,
			SenderID:   r.SenderID,
			Body:       r.Body,
			CreatedAt:  r.CreatedAt,
		}
	}
	p.detail = &scoutDetailResponse{
		Message: toScoutMessageResponse(m),
		Replies: rr,
	}
	return nil
}

func (p *ScoutPresenter) PresentCredits(_ context.Context, c *scout.ScoutCredit) error {
	p.credits = &creditsResponse{
		Balance:          c.Balance,
		MonthlyAllowance: c.MonthlyAllowance,
		MaxStock:         c.MaxStock,
		LastReplenished:  c.LastReplenishedAt,
	}
	return nil
}

func (p *ScoutPresenter) PresentQualityScore(_ context.Context, q *scout.QualityScore) error {
	p.quality = &qualityScoreResponse{
		ReplyRate14d:   q.ReplyRate14d,
		Level:          string(q.Level),
		SentLast14d:    q.SentLast14d,
		RepliedLast14d: q.RepliedLast14d,
	}
	return nil
}

func (p *ScoutPresenter) PresentScoutSettings(_ context.Context, s *scout.UserScoutSettings) error {
	p.settings = &scoutSettingsResponse{
		AcceptingScouts: s.AcceptingScouts,
		UpdatedAt:       s.UpdatedAt,
	}
	return nil
}

func (p *ScoutPresenter) PresentReceivedDetail(_ context.Context, m *scout.ScoutMessageWithNames, replies []*scout.ScoutReply) error {
	return p.PresentScoutDetail(nil, m, replies)
}

func (p *ScoutPresenter) PresentOK(_ context.Context) error {
	p.ok = true
	return nil
}

func (p *ScoutPresenter) MessageResponse() *scoutMessageResponse   { return p.message }
func (p *ScoutPresenter) ListResponse() *scoutListResponse         { return p.list }
func (p *ScoutPresenter) DetailResponse() *scoutDetailResponse     { return p.detail }
func (p *ScoutPresenter) CreditsResponse() *creditsResponse        { return p.credits }
func (p *ScoutPresenter) QualityResponse() *qualityScoreResponse   { return p.quality }
func (p *ScoutPresenter) SettingsResponse() *scoutSettingsResponse  { return p.settings }
func (p *ScoutPresenter) IsOK() bool                               { return p.ok }

func toScoutMessageResponse(m *scout.ScoutMessageWithNames) *scoutMessageResponse {
	return &scoutMessageResponse{
		ID:            m.ID,
		CompanyID:     m.CompanyID,
		CandidateID:   m.CandidateID,
		JobPostingID:  m.JobPostingID,
		Subject:       m.Subject,
		Body:          m.Body,
		Status:        string(m.Status),
		CompanyName:   m.CompanyName,
		CandidateName: m.CandidateName,
		JobTitle:      m.JobTitle,
		SentAt:        m.SentAt,
		OpenedAt:      m.OpenedAt,
		RepliedAt:     m.RepliedAt,
		ExpiresAt:     m.ExpiresAt,
		CreatedAt:     m.CreatedAt,
	}
}
