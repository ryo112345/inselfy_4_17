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
	output   port.EducationOutputPort
}

var _ port.EducationInputPort = (*EducationInteractor)(nil)

// NewEducationInteractor creates an EducationInteractor.
func NewEducationInteractor(
	repo port.EducationRepository,
	userRepo port.UserRepository,
	output port.EducationOutputPort,
) *EducationInteractor {
	return &EducationInteractor{repo: repo, userRepo: userRepo, output: output}
}

func (i *EducationInteractor) Create(ctx context.Context, rawUsername string, input education.CreateInput) error {
	u, err := i.resolveUser(ctx, rawUsername)
	if err != nil {
		return err
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
		return err
	}
	count, err := i.repo.CountByUserID(ctx, u.ID)
	if err != nil {
		return err
	}
	if count >= education.MaxPerUser {
		return education.ErrTooManyEntries
	}
	entity := &education.Education{
		UserID:    input.UserID,
		School:    input.School,
		Degree:    input.Degree,
		StartYear: input.StartYear,
		EndYear:   input.EndYear,
	}
	created, err := i.repo.Create(ctx, entity)
	if err != nil {
		return err
	}
	return i.output.PresentEducation(ctx, created)
}

func (i *EducationInteractor) Update(ctx context.Context, rawUsername, educationID string, input education.UpdateInput) error {
	u, err := i.resolveUser(ctx, rawUsername)
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
		return err
	}
	entity := &education.Education{
		ID:        existing.ID,
		UserID:    existing.UserID,
		School:    input.School,
		Degree:    input.Degree,
		StartYear: input.StartYear,
		EndYear:   input.EndYear,
	}
	updated, err := i.repo.Update(ctx, entity)
	if err != nil {
		return err
	}
	return i.output.PresentEducation(ctx, updated)
}

func (i *EducationInteractor) Delete(ctx context.Context, rawUsername, educationID string) error {
	u, err := i.resolveUser(ctx, rawUsername)
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

func (i *EducationInteractor) List(ctx context.Context, rawUsername string) error {
	u, err := i.resolveUser(ctx, rawUsername)
	if err != nil {
		return err
	}
	list, err := i.repo.ListByUserID(ctx, u.ID)
	if err != nil {
		return err
	}
	return i.output.PresentEducations(ctx, list)
}

func (i *EducationInteractor) resolveUser(ctx context.Context, raw string) (*user.User, error) {
	username, err := user.ParseUsername(raw)
	if err != nil {
		return nil, err
	}
	return i.userRepo.GetByUsername(ctx, username)
}
