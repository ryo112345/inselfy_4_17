package presenter

import (
	"math"
	"time"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
)

var scoutConv scoutConverter = &scoutConverterImpl{}

// ScoutMessageResponse builds the single scout-message API response.
func ScoutMessageResponse(m *scout.ScoutMessageWithNames) any {
	return scoutConv.ToScoutMessageResponse(m)
}

// ScoutUnreadCountResponse builds the unread-count API response.
func ScoutUnreadCountResponse(count int) any {
	return &openapi.ModelsUnreadCountResponse{Count: cast.Int32(count)}
}

// ScoutMessagesResponse builds the paginated scout-message list API response.
func ScoutMessagesResponse(msgs []*scout.ScoutMessageWithNames, total int) any {
	items := make([]openapi.ModelsScoutMessageResponse, len(msgs))
	for i, m := range msgs {
		items[i] = *scoutConv.ToScoutMessageResponse(m)
	}
	return &openapi.ModelsScoutListResponse{Items: items, Total: cast.Int32(total)}
}

// ScoutDetailResponse builds the scout-detail API response.
func ScoutDetailResponse(m *scout.ScoutMessageWithNames, replies []*scout.ScoutReply) any {
	rr := scoutConv.ToScoutReplyResponses(replies)
	if rr == nil {
		rr = []openapi.ModelsScoutReplyResponse{} // keep rendering "replies": [] (not null)
	}
	return &openapi.ModelsScoutDetailResponse{
		Message: *scoutConv.ToScoutMessageResponse(m),
		Replies: rr,
	}
}

// ScoutCreditsResponse builds the scout-credits API response.
func ScoutCreditsResponse(c *scout.ScoutCredit) any {
	return &openapi.ModelsScoutCreditsResponse{
		Balance:           c.Balance,
		MonthlyAllowance:  c.MonthlyAllowance,
		MaxStock:          c.MaxStock,
		LastReplenishedAt: c.LastReplenishedAt,
	}
}

// ScoutQualityResponse builds the scout quality-score API response.
func ScoutQualityResponse(q *scout.QualityScore) any {
	return &openapi.ModelsScoutQualityScoreResponse{
		ReplyRate14d:      q.ReplyRate14d,
		Level:             openapi.ModelsScoutQualityLevel(q.Level),
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
	return &openapi.ModelsScoutSettingsResponse{
		AcceptingScouts: s.AcceptingScouts,
		UpdatedAt:       s.UpdatedAt,
	}
}

// ScoutDashboardResponse builds the scout-dashboard API response.
func ScoutDashboardResponse(stats *scout.DashboardStats) any {
	last := stats.Credits.LastReplenishedAt
	nextReplenish := time.Date(last.Year(), last.Month()+1, 1, 0, 0, 0, 0, last.Location())

	byMonth := make([]openapi.ModelsScoutDashboardPendingByMonth, len(stats.PendingByMonth))
	for i, m := range stats.PendingByMonth {
		daysLeft := int(math.Ceil(time.Until(m.ExpiresAt).Hours() / 24))
		if daysLeft < 0 {
			daysLeft = 0
		}
		byMonth[i] = openapi.ModelsScoutDashboardPendingByMonth{
			Month:    m.SentMonth.Format("2006-01"),
			Count:    m.Count,
			DaysLeft: daysLeft,
		}
	}

	return &openapi.ModelsScoutDashboardResponse{
		Credits: openapi.ModelsScoutDashboardCredits{
			Balance:           stats.Credits.Balance,
			MaxStock:          stats.Credits.MaxStock,
			MonthlyAllowance:  stats.Credits.MonthlyAllowance,
			NextReplenishDate: nextReplenish,
		},
		Pending: openapi.ModelsScoutDashboardPending{
			Total:   stats.PendingTotal,
			ByMonth: byMonth,
		},
		ReplyRate:    math.Round(stats.ReplyRate*10) / 10,
		AvgReplyDays: math.Round(stats.AvgReplyDays*10) / 10,
		SentLast90d:  stats.SentLast90d,
	}
}
