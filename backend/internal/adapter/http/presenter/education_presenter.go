package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/education"
)

// EducationResponse converts a single education entity to its API response.
func EducationResponse(e *education.Education) openapi.ModelsEducationResponse {
	return *toEducationResponse(e)
}

// EducationsResponse converts a list of education entities to their API response.
func EducationsResponse(es []*education.Education) openapi.ModelsEducationListResponse {
	items := make([]openapi.ModelsEducationResponse, 0, len(es))
	for _, e := range es {
		items = append(items, *toEducationResponse(e))
	}
	return openapi.ModelsEducationListResponse{Items: items}
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
