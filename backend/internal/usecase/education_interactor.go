package usecase

import (
	"context"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/domain/education"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// EducationInteractor handles education use cases.
type EducationInteractor struct {
	repo     port.EducationRepository
	userRepo port.UserRepository
}

var _ port.EducationInputPort = (*EducationInteractor)(nil)

// NewEducationInteractor creates an EducationInteractor.
func NewEducationInteractor(
	repo port.EducationRepository,
	userRepo port.UserRepository,
) *EducationInteractor {
	return &EducationInteractor{repo: repo, userRepo: userRepo}
}

func (i *EducationInteractor) Create(ctx context.Context, authUserID, rawUsername string, input education.CreateInput) (*education.Education, error) {
	u, err := i.resolveOwnedUser(ctx, authUserID, rawUsername)
	if err != nil {
		return nil, err
	}
	input.UserID = u.ID
	input.School = strings.TrimSpace(input.School)
	if input.Degree != nil {
		trimmed := strings.TrimSpace(*input.Degree)
		if trimmed == "" {
			input.Degree = nil
		} else {
			input.Degree = &trimmed
		}
	}
	if err := education.ValidateCreate(input); err != nil {
		return nil, err
	}
	count, err := i.repo.CountByUserID(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	if count >= education.MaxPerUser {
		return nil, education.ErrTooManyEntries
	}
	entity := &education.Education{
		UserID:    input.UserID,
		School:    input.School,
		Degree:    input.Degree,
		StartYear: input.StartYear,
		EndYear:   input.EndYear,
	}
	return i.repo.Create(ctx, entity)
}

func (i *EducationInteractor) Update(ctx context.Context, authUserID, rawUsername, educationID string, input education.UpdateInput) (*education.Education, error) {
	u, err := i.resolveOwnedUser(ctx, authUserID, rawUsername)
	if err != nil {
		return nil, err
	}
	existing, err := i.repo.GetByID(ctx, educationID)
	if err != nil {
		return nil, err
	}
	if existing.UserID != u.ID {
		return nil, port.ErrForbidden
	}
	input.ID = existing.ID
	input.School = strings.TrimSpace(input.School)
	if input.Degree != nil {
		trimmed := strings.TrimSpace(*input.Degree)
		if trimmed == "" {
			input.Degree = nil
		} else {
			input.Degree = &trimmed
		}
	}
	if err := education.ValidateUpdate(input); err != nil {
		return nil, err
	}
	entity := &education.Education{
		ID:        existing.ID,
		UserID:    existing.UserID,
		School:    input.School,
		Degree:    input.Degree,
		StartYear: input.StartYear,
		EndYear:   input.EndYear,
	}
	return i.repo.Update(ctx, entity)
}

func (i *EducationInteractor) Delete(ctx context.Context, authUserID, rawUsername, educationID string) error {
	u, err := i.resolveOwnedUser(ctx, authUserID, rawUsername)
	if err != nil {
		return err
	}
	existing, err := i.repo.GetByID(ctx, educationID)
	if err != nil {
		return err
	}
	if existing.UserID != u.ID {
		return port.ErrForbidden
	}
	return i.repo.Delete(ctx, existing.ID)
}

func (i *EducationInteractor) List(ctx context.Context, rawUsername string) ([]*education.Education, error) {
	u, err := i.resolveUser(ctx, rawUsername)
	if err != nil {
		return nil, err
	}
	return i.repo.ListByUserID(ctx, u.ID)
}

func (i *EducationInteractor) resolveUser(ctx context.Context, raw string) (*user.User, error) {
	username, err := user.ParseUsername(raw)
	if err != nil {
		return nil, err
	}
	return i.userRepo.GetByUsername(ctx, username)
}

// resolveOwnedUser resolves the path user and verifies the authenticated
// caller IS that user (see ExperienceInteractor.resolveOwnedUser for why the
// resource-ownership check alone is insufficient).
func (i *EducationInteractor) resolveOwnedUser(ctx context.Context, authUserID, raw string) (*user.User, error) {
	u, err := i.resolveUser(ctx, raw)
	if err != nil {
		return nil, err
	}
	if u.ID != authUserID {
		return nil, port.ErrForbidden
	}
	return u, nil
}
