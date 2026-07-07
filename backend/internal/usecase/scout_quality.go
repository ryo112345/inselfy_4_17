package usecase

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/scout"
)

func (i *ScoutInteractor) GetQualityScore(ctx context.Context, companyID string) (*scout.QualityScore, error) {
	credit, err := i.creditRepo.GetOrCreate(ctx, companyID)
	if err != nil {
		return nil, err
	}
	qResult, err := i.evaluateQuality(ctx, companyID, credit)
	if err != nil {
		return nil, err
	}
	if err := i.applyQualityTransitions(ctx, companyID, qResult); err != nil {
		return nil, err
	}
	return &qResult.Score, nil
}

func (i *ScoutInteractor) evaluateQuality(ctx context.Context, companyID string, credit *scout.ScoutCredit) (scout.QualityResult, error) {
	now := time.Now()

	sent14, err := i.msgRepo.CountSentLastNDays(ctx, companyID, scout.DefaultLookbackDays)
	if err != nil {
		return scout.QualityResult{}, err
	}
	replied14, err := i.msgRepo.CountRepliedLastNDays(ctx, companyID, scout.DefaultLookbackDays)
	if err != nil {
		return scout.QualityResult{}, err
	}

	var sent20, replied20 int
	if credit.WarningStartedAt != nil {
		deadline := credit.WarningStartedAt.Add(scout.WarningImprovementDays * 24 * time.Hour)
		if !now.Before(deadline) {
			sent20, err = i.msgRepo.CountSentLastNDays(ctx, companyID, scout.WarningExtendedLookback)
			if err != nil {
				return scout.QualityResult{}, err
			}
			replied20, err = i.msgRepo.CountRepliedLastNDays(ctx, companyID, scout.WarningExtendedLookback)
			if err != nil {
				return scout.QualityResult{}, err
			}
		}
	}

	return scout.EvaluateQuality(scout.QualityInput{
		Sent14d:              sent14,
		Replied14d:           replied14,
		Sent20d:              sent20,
		Replied20d:           replied20,
		WarningStartedAt:     credit.WarningStartedAt,
		RestrictionStartedAt: credit.RestrictionStartedAt,
		QualityRestricted:    credit.QualityRestricted,
		Now:                  now,
	}), nil
}

func (i *ScoutInteractor) applyQualityTransitions(ctx context.Context, companyID string, result scout.QualityResult) error {
	if result.ShouldSetWarning {
		return i.creditRepo.SetQualityWarning(ctx, companyID)
	}
	if result.ShouldClearWarning {
		return i.creditRepo.ClearQualityWarning(ctx, companyID)
	}
	if result.ShouldTempRestrict {
		return i.creditRepo.SetTemporaryRestriction(ctx, companyID)
	}
	if result.ShouldClearRestriction {
		return i.creditRepo.ClearTemporaryRestriction(ctx, companyID)
	}
	if result.ShouldRestrict {
		return i.creditRepo.SetQualityRestricted(ctx, companyID)
	}
	return nil
}
