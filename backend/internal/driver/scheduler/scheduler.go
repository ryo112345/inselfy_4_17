package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/akiyama/inselfy/backend/internal/port"
)

type Scheduler struct {
	msgRepo    port.ScoutMessageRepository
	creditRepo port.ScoutCreditRepository
}

func New(
	msgRepo port.ScoutMessageRepository,
	creditRepo port.ScoutCreditRepository,
) *Scheduler {
	return &Scheduler{
		msgRepo:    msgRepo,
		creditRepo: creditRepo,
	}
}

func (s *Scheduler) Start(ctx context.Context) {
	go s.run(ctx)
}

func (s *Scheduler) run(ctx context.Context) {
	s.tick(ctx)

	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.tick(ctx)
		}
	}
}

func (s *Scheduler) tick(ctx context.Context) {
	s.expireOverdueScouts(ctx)
	s.replenishCredits(ctx)
}

func (s *Scheduler) expireOverdueScouts(ctx context.Context) {
	n, err := s.msgRepo.ExpireOverdue(ctx)
	if err != nil {
		log.Printf("[scheduler] expire overdue scouts: %v", err)
		return
	}
	if n > 0 {
		log.Printf("[scheduler] expired %d overdue scouts", n)
	}
}

func (s *Scheduler) replenishCredits(ctx context.Context) {
	replenished, err := s.creditRepo.ReplenishAll(ctx)
	if err != nil {
		log.Printf("[scheduler] replenish credits: %v", err)
		return
	}
	if len(replenished) > 0 {
		log.Printf("[scheduler] replenished credits for %d companies", len(replenished))
	}
}
