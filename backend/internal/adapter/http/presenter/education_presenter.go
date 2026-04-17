package presenter

import (
	"context"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/education"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// EducationPresenter converts a domain education to the generated OpenAPI response type.
type EducationPresenter struct {
	single *openapi.ModelsEducationResponse
	list   *openapi.ModelsEducationListResponse
}

var _ port.EducationOutputPort = (*EducationPresenter)(nil)

// NewEducationPresenter creates an EducationPresenter.
func NewEducationPresenter() *EducationPresenter {
	return &EducationPresenter{}
}

func (p *EducationPresenter) PresentEducation(_ context.Context, e *education.Education) error {
	p.single = toEducationResponse(e)
	return nil
}

func (p *EducationPresenter) PresentEducations(_ context.Context, es []*education.Education) error {
	items := make([]openapi.ModelsEducationResponse, 0, len(es))
	for _, e := range es {
		items = append(items, *toEducationResponse(e))
	}
	p.list = &openapi.ModelsEducationListResponse{Items: items}
	return nil
}

func (p *EducationPresenter) Single() *openapi.ModelsEducationResponse { return p.single }
func (p *EducationPresenter) List() *openapi.ModelsEducationListResponse {
	return p.list
}

func toEducationResponse(e *education.Education) *openapi.ModelsEducationResponse {
	return &openapi.ModelsEducationResponse{
		Id:        e.ID,
		UserId:    e.UserID,
		School:    e.School,
		Degree:    e.Degree,
		StartYear: int2PtrToInt32Ptr(e.StartYear),
		EndYear:   int2PtrToInt32Ptr(e.EndYear),
		CreatedAt: e.CreatedAt,
		UpdatedAt: e.UpdatedAt,
	}
}
