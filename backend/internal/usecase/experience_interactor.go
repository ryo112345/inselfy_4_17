package usecase

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ExperienceInteractor handles experience use cases.
type ExperienceInteractor struct {
	repo     port.ExperienceRepository
	userRepo port.UserRepository
}

var _ port.ExperienceInputPort = (*ExperienceInteractor)(nil)

// NewExperienceInteractor creates an ExperienceInteractor.
func NewExperienceInteractor(
	repo port.ExperienceRepository,
	userRepo port.UserRepository,
) *ExperienceInteractor {
	return &ExperienceInteractor{repo: repo, userRepo: userRepo}
}

// Create validates and persists a new experience, then returns it.
func (i *ExperienceInteractor) Create(ctx context.Context, rawUsername string, input experience.CreateInput) (*experience.Experience, error) {
	u, err := i.resolveUser(ctx, rawUsername)
	if err != nil {
		return nil, err
	}
	input.UserID = u.ID
	normalizeStrings(&input.CompanyName, &input.Title)
	if err := experience.ValidateCreate(input); err != nil {
		return nil, err
	}
	count, err := i.repo.CountByUserID(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	if count >= experience.MaxPerUser {
		return nil, experience.ErrTooManyEntries
	}
	entity := &experience.Experience{
		UserID:      input.UserID,
		CompanyName: input.CompanyName,
		Title:       input.Title,
		StartYear:   input.StartYear,
		StartMonth:  input.StartMonth,
		EndYear:     input.EndYear,
		EndMonth:    input.EndMonth,
		IsCurrent:   input.IsCurrent,
		Description: input.Description,
	}
	return i.repo.Create(ctx, entity)
}

// Update replaces an existing experience. Ownership is verified before mutation.
func (i *ExperienceInteractor) Update(ctx context.Context, rawUsername, experienceID string, input experience.UpdateInput) (*experience.Experience, error) {
	u, err := i.resolveUser(ctx, rawUsername)
	if err != nil {
		return nil, err
	}
	existing, err := i.repo.GetByID(ctx, experienceID)
	if err != nil {
		return nil, err
	}
	if existing.UserID != u.ID {
		return nil, port.ErrForbidden
	}
	input.ID = existing.ID
	normalizeStrings(&input.CompanyName, &input.Title)
	if err := experience.ValidateUpdate(input); err != nil {
		return nil, err
	}
	entity := &experience.Experience{
		ID:          existing.ID,
		UserID:      existing.UserID,
		CompanyName: input.CompanyName,
		Title:       input.Title,
		StartYear:   input.StartYear,
		StartMonth:  input.StartMonth,
		EndYear:     input.EndYear,
		EndMonth:    input.EndMonth,
		IsCurrent:   input.IsCurrent,
		Description: input.Description,
	}
	return i.repo.Update(ctx, entity)
}

// Delete removes an experience after verifying ownership.
func (i *ExperienceInteractor) Delete(ctx context.Context, rawUsername, experienceID string) error {
	u, err := i.resolveUser(ctx, rawUsername)
	if err != nil {
		return err
	}
	existing, err := i.repo.GetByID(ctx, experienceID)
	if err != nil {
		return err
	}
	if existing.UserID != u.ID {
		return port.ErrForbidden
	}
	return i.repo.Delete(ctx, existing.ID)
}

// List returns all experiences for a user.
func (i *ExperienceInteractor) List(ctx context.Context, rawUsername string) ([]*experience.Experience, error) {
	u, err := i.resolveUser(ctx, rawUsername)
	if err != nil {
		return nil, err
	}
	return i.repo.ListByUserID(ctx, u.ID)
}

func (i *ExperienceInteractor) resolveUser(ctx context.Context, raw string) (*user.User, error) {
	username, err := user.ParseUsername(raw)
	if err != nil {
		return nil, err
	}
	return i.userRepo.GetByUsername(ctx, username)
}
