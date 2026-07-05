package presenter

import (
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/scout"
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

// ScoutTemplateResponse converts a single scout template entity to its API response.
func ScoutTemplateResponse(t *scout.ScoutTemplate) any { return toTemplateResponse(t) }

// ScoutTemplatesResponse converts a list of scout template entities to their API response.
func ScoutTemplatesResponse(ts []*scout.ScoutTemplate) any {
	items := make([]*templateResponse, len(ts))
	for i, t := range ts {
		items[i] = toTemplateResponse(t)
	}
	return items
}

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
