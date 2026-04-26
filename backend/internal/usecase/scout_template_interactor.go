package usecase

import (
	"context"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ScoutTemplateInteractor struct {
	repo   port.ScoutTemplateRepository
	output port.ScoutTemplateOutputPort
}

var _ port.ScoutTemplateInputPort = (*ScoutTemplateInteractor)(nil)

func NewScoutTemplateInteractor(
	repo port.ScoutTemplateRepository,
	output port.ScoutTemplateOutputPort,
) *ScoutTemplateInteractor {
	return &ScoutTemplateInteractor{repo: repo, output: output}
}

func (i *ScoutTemplateInteractor) Create(ctx context.Context, input scout.CreateTemplateInput) error {
	input.Name = strings.TrimSpace(input.Name)
	input.Subject = strings.TrimSpace(input.Subject)
	input.Body = strings.TrimSpace(input.Body)
	if err := scout.ValidateTemplate(input); err != nil {
		return err
	}

	count, err := i.repo.CountByCompanyID(ctx, input.CompanyID)
	if err != nil {
		return err
	}
	if count >= scout.MaxTemplatesPerCompany {
		return scout.ErrTooManyTemplates
	}

	t, err := i.repo.Create(ctx, &scout.ScoutTemplate{
		CompanyID: input.CompanyID,
		Name:      input.Name,
		Subject:   input.Subject,
		Body:      input.Body,
	})
	if err != nil {
		return err
	}
	return i.output.PresentTemplate(ctx, t)
}

func (i *ScoutTemplateInteractor) List(ctx context.Context, companyID string) error {
	ts, err := i.repo.ListByCompanyID(ctx, companyID)
	if err != nil {
		return err
	}
	return i.output.PresentTemplates(ctx, ts)
}

func (i *ScoutTemplateInteractor) Get(ctx context.Context, companyID, templateID string) error {
	t, err := i.repo.GetByID(ctx, templateID)
	if err != nil {
		return err
	}
	if t.CompanyID != companyID {
		return scout.ErrNotOwner
	}
	return i.output.PresentTemplate(ctx, t)
}

func (i *ScoutTemplateInteractor) Update(ctx context.Context, companyID, templateID string, input scout.UpdateTemplateInput) error {
	input.Name = strings.TrimSpace(input.Name)
	input.Subject = strings.TrimSpace(input.Subject)
	input.Body = strings.TrimSpace(input.Body)
	if err := scout.ValidateTemplateUpdate(input); err != nil {
		return err
	}

	existing, err := i.repo.GetByID(ctx, templateID)
	if err != nil {
		return err
	}
	if existing.CompanyID != companyID {
		return scout.ErrNotOwner
	}

	existing.Name = input.Name
	existing.Subject = input.Subject
	existing.Body = input.Body

	t, err := i.repo.Update(ctx, existing)
	if err != nil {
		return err
	}
	return i.output.PresentTemplate(ctx, t)
}

func (i *ScoutTemplateInteractor) Delete(ctx context.Context, companyID, templateID string) error {
	t, err := i.repo.GetByID(ctx, templateID)
	if err != nil {
		return err
	}
	if t.CompanyID != companyID {
		return scout.ErrNotOwner
	}
	return i.repo.Delete(ctx, templateID)
}
