package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/scout"
)

type ScoutTemplateInputPort interface {
	Create(ctx context.Context, input scout.CreateTemplateInput) error
	List(ctx context.Context, companyID string) error
	Get(ctx context.Context, companyID, templateID string) error
	Update(ctx context.Context, companyID, templateID string, input scout.UpdateTemplateInput) error
	Delete(ctx context.Context, companyID, templateID string) error
}

type ScoutTemplateOutputPort interface {
	PresentTemplate(ctx context.Context, t *scout.ScoutTemplate) error
	PresentTemplates(ctx context.Context, ts []*scout.ScoutTemplate) error
}

type ScoutTemplateRepository interface {
	Create(ctx context.Context, t *scout.ScoutTemplate) (*scout.ScoutTemplate, error)
	GetByID(ctx context.Context, id string) (*scout.ScoutTemplate, error)
	Update(ctx context.Context, t *scout.ScoutTemplate) (*scout.ScoutTemplate, error)
	Delete(ctx context.Context, id string) error
	ListByCompanyID(ctx context.Context, companyID string) ([]*scout.ScoutTemplate, error)
	CountByCompanyID(ctx context.Context, companyID string) (int64, error)
}
