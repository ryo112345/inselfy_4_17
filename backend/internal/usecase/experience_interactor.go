package usecase

import (
	"context"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ExperienceInteractor handles experience use cases.
type ExperienceInteractor struct {
	repo     port.ExperienceRepository
	userRepo port.UserRepository
	output   port.ExperienceOutputPort
}

var _ port.ExperienceInputPort = (*ExperienceInteractor)(nil)

// NewExperienceInteractor creates an ExperienceInteractor.
func NewExperienceInteractor(
	repo port.ExperienceRepository,
	userRepo port.UserRepository,
	output port.ExperienceOutputPort,
) *ExperienceInteractor {
	return &ExperienceInteractor{repo: repo, userRepo: userRepo, output: output}
}

// Create validates and persists a new experience, then presents it.
func (i *ExperienceInteractor) Create(ctx context.Context, rawUsername string, input experience.CreateInput) error {
	u, err := i.resolveUser(ctx, rawUsername)
	if err != nil {
		return err
	}
	input.UserID = u.ID
	input.CompanyName = strings.TrimSpace(input.CompanyName)
	input.Title = strings.TrimSpace(input.Title)
	if err := experience.ValidateCreate(input); err != nil {
		return err
	}
	count, err := i.repo.CountByUserID(ctx, u.ID)
	if err != nil {
		return err
	}
	if count >= experience.MaxPerUser {
		return experience.ErrTooManyEntries
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
	created, err := i.repo.Create(ctx, entity)
	if err != nil {
		return err
	}
	return i.output.PresentExperience(ctx, created)
}

// Update replaces an existing experience. Ownership is verified before mutation.
func (i *ExperienceInteractor) Update(ctx context.Context, rawUsername, experienceID string, input experience.UpdateInput) error {
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
	input.ID = existing.ID
	input.CompanyName = strings.TrimSpace(input.CompanyName)
	input.Title = strings.TrimSpace(input.Title)
	if err := experience.ValidateUpdate(input); err != nil {
		return err
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
	updated, err := i.repo.Update(ctx, entity)
	if err != nil {
		return err
	}
	return i.output.PresentExperience(ctx, updated)
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
func (i *ExperienceInteractor) List(ctx context.Context, rawUsername string) error {
	u, err := i.resolveUser(ctx, rawUsername)
	if err != nil {
		return err
	}
	list, err := i.repo.ListByUserID(ctx, u.ID)
	if err != nil {
		return err
	}
	return i.output.PresentExperiences(ctx, list)
}

func (i *ExperienceInteractor) resolveUser(ctx context.Context, raw string) (*user.User, error) {
	username, err := user.ParseUsername(raw)
	if err != nil {
		return nil, err
	}
	return i.userRepo.GetByUsername(ctx, username)
}
