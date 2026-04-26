package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type templateResponse struct {
	ID        string    `json:"id"`
	CompanyID string    `json:"companyId"`
	Name      string    `json:"name"`
	Subject   string    `json:"subject"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ScoutTemplatePresenter struct {
	single *templateResponse
	list   []*templateResponse
}

var _ port.ScoutTemplateOutputPort = (*ScoutTemplatePresenter)(nil)

func NewScoutTemplatePresenter() *ScoutTemplatePresenter {
	return &ScoutTemplatePresenter{}
}

func (p *ScoutTemplatePresenter) PresentTemplate(_ context.Context, t *scout.ScoutTemplate) error {
	p.single = toTemplateResponse(t)
	return nil
}

func (p *ScoutTemplatePresenter) PresentTemplates(_ context.Context, ts []*scout.ScoutTemplate) error {
	items := make([]*templateResponse, len(ts))
	for i, t := range ts {
		items[i] = toTemplateResponse(t)
	}
	p.list = items
	return nil
}

func (p *ScoutTemplatePresenter) SingleResponse() *templateResponse   { return p.single }
func (p *ScoutTemplatePresenter) ListResponse() []*templateResponse   { return p.list }

func toTemplateResponse(t *scout.ScoutTemplate) *templateResponse {
	return &templateResponse{
		ID:        t.ID,
		CompanyID: t.CompanyID,
		Name:      t.Name,
		Subject:   t.Subject,
		Body:      t.Body,
		CreatedAt: t.CreatedAt,
		UpdatedAt: t.UpdatedAt,
	}
}
