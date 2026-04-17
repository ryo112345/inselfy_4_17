package presenter

import (
	"context"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ExperiencePresenter converts a domain experience to the generated OpenAPI response type.
type ExperiencePresenter struct {
	single *openapi.ModelsExperienceResponse
	list   *openapi.ModelsExperienceListResponse
}

var _ port.ExperienceOutputPort = (*ExperiencePresenter)(nil)

// NewExperiencePresenter creates an ExperiencePresenter.
func NewExperiencePresenter() *ExperiencePresenter {
	return &ExperiencePresenter{}
}

func (p *ExperiencePresenter) PresentExperience(_ context.Context, e *experience.Experience) error {
	p.single = toExperienceResponse(e)
	return nil
}

func (p *ExperiencePresenter) PresentExperiences(_ context.Context, es []*experience.Experience) error {
	items := make([]openapi.ModelsExperienceResponse, 0, len(es))
	for _, e := range es {
		items = append(items, *toExperienceResponse(e))
	}
	p.list = &openapi.ModelsExperienceListResponse{Items: items}
	return nil
}

// Single returns the last single-experience response.
func (p *ExperiencePresenter) Single() *openapi.ModelsExperienceResponse { return p.single }

// List returns the last list response.
func (p *ExperiencePresenter) List() *openapi.ModelsExperienceListResponse { return p.list }

func toExperienceResponse(e *experience.Experience) *openapi.ModelsExperienceResponse {
	return &openapi.ModelsExperienceResponse{
		Id:          e.ID,
		UserId:      e.UserID,
		CompanyName: e.CompanyName,
		Title:       e.Title,
		StartYear:   int32(e.StartYear),
		StartMonth:  int32(e.StartMonth),
		EndYear:     int2PtrToInt32Ptr(e.EndYear),
		EndMonth:    int2PtrToInt32Ptr(e.EndMonth),
		IsCurrent:   e.IsCurrent,
		Description: e.Description,
		CreatedAt:   e.CreatedAt,
		UpdatedAt:   e.UpdatedAt,
	}
}

func int2PtrToInt32Ptr(v *int16) *int32 {
	if v == nil {
		return nil
	}
	n := int32(*v)
	return &n
}
