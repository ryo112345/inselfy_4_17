package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
)

// ExperienceResponse converts a single experience to its API response.
func ExperienceResponse(e *experience.Experience) any { return toExperienceResponse(e) }

// ExperiencesResponse converts a list of experiences to its API response.
func ExperiencesResponse(es []*experience.Experience) any {
	items := make([]openapi.ModelsExperienceResponse, 0, len(es))
	for _, e := range es {
		items = append(items, *toExperienceResponse(e))
	}
	return &openapi.ModelsExperienceListResponse{Items: items}
}

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
