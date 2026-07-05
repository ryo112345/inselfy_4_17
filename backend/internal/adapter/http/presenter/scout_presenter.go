package presenter

import (
	"math"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/scout"
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
	ReplyRate14d      float64    `json:"replyRate14d"`
	Level             string     `json:"level"`
	SentLast14d       int        `json:"sentLast14d"`
	RepliedLast14d    int        `json:"repliedLast14d"`
	WarningStartedAt  *time.Time `json:"warningStartedAt,omitempty"`
	WarningDeadline   *time.Time `json:"warningDeadline,omitempty"`
	DaysRemaining     *int       `json:"daysRemaining,omitempty"`
	RestrictionEndsAt *time.Time `json:"restrictionEndsAt,omitempty"`
}

type scoutSettingsResponse struct {
	AcceptingScouts bool      `json:"acceptingScouts"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type dashboardPendingByMonthResponse struct {
	Month    string `json:"month"`
	Count    int    `json:"count"`
	DaysLeft int    `json:"daysLeft"`
}

type dashboardResponse struct {
	Credits struct {
		Balance           int       `json:"balance"`
		MaxStock          int       `json:"maxStock"`
		MonthlyAllowance  int       `json:"monthlyAllowance"`
		NextReplenishDate time.Time `json:"nextReplenishDate"`
	} `json:"credits"`
	Pending struct {
		Total   int                               `json:"total"`
		ByMonth []dashboardPendingByMonthResponse `json:"byMonth"`
	} `json:"pending"`
	ReplyRate    float64 `json:"replyRate"`
	AvgReplyDays float64 `json:"avgReplyDays"`
	SentLast90d  int     `json:"sentLast90d"`
}

// ScoutMessageResponse builds the single scout-message API response.
func ScoutMessageResponse(m *scout.ScoutMessageWithNames) any {
	return toScoutMessageResponse(m)
}

// ScoutMessagesResponse builds the paginated scout-message list API response.
func ScoutMessagesResponse(msgs []*scout.ScoutMessageWithNames, total int) any {
	items := make([]*scoutMessageResponse, len(msgs))
	for i, m := range msgs {
		items[i] = toScoutMessageResponse(m)
	}
	return &scoutListResponse{Items: items, Total: total}
}

// ScoutDetailResponse builds the scout-detail API response.
func ScoutDetailResponse(m *scout.ScoutMessageWithNames, replies []*scout.ScoutReply) any {
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
	return &scoutDetailResponse{
		Message: toScoutMessageResponse(m),
		Replies: rr,
	}
}

// ScoutCreditsResponse builds the scout-credits API response.
func ScoutCreditsResponse(c *scout.ScoutCredit) any {
	return &creditsResponse{
		Balance:          c.Balance,
		MonthlyAllowance: c.MonthlyAllowance,
		MaxStock:         c.MaxStock,
		LastReplenished:  c.LastReplenishedAt,
	}
}

// ScoutQualityResponse builds the scout quality-score API response.
func ScoutQualityResponse(q *scout.QualityScore) any {
	return &qualityScoreResponse{
		ReplyRate14d:      q.ReplyRate14d,
		Level:             string(q.Level),
		SentLast14d:       q.SentLast14d,
		RepliedLast14d:    q.RepliedLast14d,
		WarningStartedAt:  q.WarningStartedAt,
		WarningDeadline:   q.WarningDeadline,
		DaysRemaining:     q.DaysRemaining,
		RestrictionEndsAt: q.RestrictionEndsAt,
	}
}

// ScoutSettingsResponse builds the scout-settings API response.
func ScoutSettingsResponse(s *scout.UserScoutSettings) any {
	return &scoutSettingsResponse{
		AcceptingScouts: s.AcceptingScouts,
		UpdatedAt:       s.UpdatedAt,
	}
}

// ScoutDashboardResponse builds the scout-dashboard API response.
func ScoutDashboardResponse(stats *scout.DashboardStats) any {
	last := stats.Credits.LastReplenishedAt
	nextReplenish := time.Date(last.Year(), last.Month()+1, 1, 0, 0, 0, 0, last.Location())

	byMonth := make([]dashboardPendingByMonthResponse, len(stats.PendingByMonth))
	for i, m := range stats.PendingByMonth {
		daysLeft := int(math.Ceil(time.Until(m.ExpiresAt).Hours() / 24))
		if daysLeft < 0 {
			daysLeft = 0
		}
		byMonth[i] = dashboardPendingByMonthResponse{
			Month:    m.SentMonth.Format("2006-01"),
			Count:    m.Count,
			DaysLeft: daysLeft,
		}
	}

	resp := &dashboardResponse{
		ReplyRate:    math.Round(stats.ReplyRate*10) / 10,
		AvgReplyDays: math.Round(stats.AvgReplyDays*10) / 10,
		SentLast90d:  stats.SentLast90d,
	}
	resp.Credits.Balance = stats.Credits.Balance
	resp.Credits.MaxStock = stats.Credits.MaxStock
	resp.Credits.MonthlyAllowance = stats.Credits.MonthlyAllowance
	resp.Credits.NextReplenishDate = nextReplenish
	resp.Pending.Total = stats.PendingTotal
	resp.Pending.ByMonth = byMonth

	return resp
}

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
