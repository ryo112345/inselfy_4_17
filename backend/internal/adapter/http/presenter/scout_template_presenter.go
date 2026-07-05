package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
)

// ScoutTemplateResponse converts a single scout template entity to its API response.
func ScoutTemplateResponse(t *scout.ScoutTemplate) any { return toTemplateResponse(t) }

// ScoutTemplatesResponse converts a list of scout template entities to their API response.
func ScoutTemplatesResponse(ts []*scout.ScoutTemplate) any {
	items := make([]*openapi.ModelsScoutTemplateResponse, len(ts))
	for i, t := range ts {
		items[i] = toTemplateResponse(t)
	}
	return items
}

func toTemplateResponse(t *scout.ScoutTemplate) *openapi.ModelsScoutTemplateResponse {
	return &openapi.ModelsScoutTemplateResponse{
		Id:        t.ID,
		CompanyId: t.CompanyID,
		Name:      t.Name,
		Subject:   t.Subject,
		Body:      t.Body,
		CreatedAt: t.CreatedAt,
		UpdatedAt: t.UpdatedAt,
	}
}
