package usecase

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ScoutTemplateInteractor struct {
	repo port.ScoutTemplateRepository
}

var _ port.ScoutTemplateInputPort = (*ScoutTemplateInteractor)(nil)

func NewScoutTemplateInteractor(
	repo port.ScoutTemplateRepository,
) *ScoutTemplateInteractor {
	return &ScoutTemplateInteractor{repo: repo}
}

func (i *ScoutTemplateInteractor) Create(ctx context.Context, input scout.CreateTemplateInput) (*scout.ScoutTemplate, error) {
	normalizeStrings(&input.Name, &input.Subject, &input.Body)
	if err := scout.ValidateTemplate(input); err != nil {
		return nil, err
	}

	count, err := i.repo.CountByCompanyID(ctx, input.CompanyID)
	if err != nil {
		return nil, err
	}
	if count >= scout.MaxTemplatesPerCompany {
		return nil, scout.ErrTooManyTemplates
	}

	return i.repo.Create(ctx, &scout.ScoutTemplate{
		CompanyID: input.CompanyID,
		Name:      input.Name,
		Subject:   input.Subject,
		Body:      input.Body,
	})
}

func (i *ScoutTemplateInteractor) List(ctx context.Context, companyID string) ([]*scout.ScoutTemplate, error) {
	return i.repo.ListByCompanyID(ctx, companyID)
}

func (i *ScoutTemplateInteractor) Get(ctx context.Context, companyID, templateID string) (*scout.ScoutTemplate, error) {
	t, err := i.repo.GetByID(ctx, templateID)
	if err != nil {
		return nil, err
	}
	if t.CompanyID != companyID {
		return nil, scout.ErrNotOwner
	}
	return t, nil
}

func (i *ScoutTemplateInteractor) Update(ctx context.Context, companyID, templateID string, input scout.UpdateTemplateInput) (*scout.ScoutTemplate, error) {
	normalizeStrings(&input.Name, &input.Subject, &input.Body)
	if err := scout.ValidateTemplateUpdate(input); err != nil {
		return nil, err
	}

	existing, err := i.repo.GetByID(ctx, templateID)
	if err != nil {
		return nil, err
	}
	if existing.CompanyID != companyID {
		return nil, scout.ErrNotOwner
	}

	existing.Name = input.Name
	existing.Subject = input.Subject
	existing.Body = input.Body

	return i.repo.Update(ctx, existing)
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
