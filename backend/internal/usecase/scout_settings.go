package usecase

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/scout"
)

func (i *ScoutInteractor) UpdateScoutSettings(ctx context.Context, userID string, accepting bool) (*scout.UserScoutSettings, error) {
	s, err := i.settingsRepo.Upsert(ctx, &scout.UserScoutSettings{
		UserID:          userID,
		AcceptingScouts: accepting,
	})
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (i *ScoutInteractor) GetScoutSettings(ctx context.Context, userID string) (*scout.UserScoutSettings, error) {
	s, err := i.settingsRepo.GetByUserID(ctx, userID)
	if err != nil {
		if isNotFound(err) {
			return &scout.UserScoutSettings{
				UserID:          userID,
				AcceptingScouts: true,
			}, nil
		}
		return nil, err
	}
	return s, nil
}

func (i *ScoutInteractor) GetDashboard(ctx context.Context, companyID string) (*scout.DashboardStats, error) {
	credit, err := i.creditRepo.GetOrCreate(ctx, companyID)
	if err != nil {
		return nil, err
	}

	dbPending, err := i.msgRepo.CountPendingByMonth(ctx, companyID)
	if err != nil {
		return nil, err
	}
	countByMonth := make(map[string]int)
	for _, p := range dbPending {
		key := p.SentMonth.Format("2006-01")
		countByMonth[key] = p.Count
	}

	now := time.Now()
	pendingByMonth := make([]scout.PendingByMonth, 0, 4)
	pendingTotal := 0
	for offset := 3; offset >= 0; offset-- {
		m := time.Date(now.Year(), now.Month()-time.Month(offset), 1, 0, 0, 0, 0, now.Location())
		expiresAt := scout.CalcExpiresAt(m)
		if expiresAt.Before(now) {
			continue
		}
		key := m.Format("2006-01")
		count := countByMonth[key]
		pendingTotal += count
		pendingByMonth = append(pendingByMonth, scout.PendingByMonth{
			SentMonth: m,
			Count:     count,
			ExpiresAt: expiresAt,
		})
	}

	sent90, err := i.msgRepo.CountSentLastNDays(ctx, companyID, 90)
	if err != nil {
		return nil, err
	}
	replied90, err := i.msgRepo.CountRepliedLastNDays(ctx, companyID, 90)
	if err != nil {
		return nil, err
	}
	var replyRate float64
	if sent90 > 0 {
		replyRate = float64(replied90) / float64(sent90) * 100.0
	}

	avgReplyDays, err := i.msgRepo.AvgReplyDays(ctx, companyID)
	if err != nil {
		return nil, err
	}

	return &scout.DashboardStats{
		Credits:        credit,
		PendingTotal:   pendingTotal,
		PendingByMonth: pendingByMonth,
		ReplyRate:      replyRate,
		AvgReplyDays:   avgReplyDays,
		SentLast90d:    sent90,
	}, nil
}
