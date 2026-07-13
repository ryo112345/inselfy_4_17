package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
)

// SimilarUsersResponse builds the similar-users API response.
func SimilarUsersResponse(users []workvalues.SimilarUser) *openapi.ModelsSimilarUsersResponse {
	items := make([]openapi.ModelsSimilarUserItem, 0, len(users))
	for _, u := range users {
		items = append(items, toSimilarUserItem(u))
	}
	return &openapi.ModelsSimilarUsersResponse{
		Items: &items,
		Total: cast.Int32(len(items)),
	}
}

func toSimilarUserItem(u workvalues.SimilarUser) openapi.ModelsSimilarUserItem {
	item := openapi.ModelsSimilarUserItem{
		UserId:       u.UserID,
		Username:     u.Username,
		Name:         u.Name,
		Headline:     u.Headline,
		AvatarUrl:    u.AvatarURL,
		ProfileColor: u.ProfileColor,
		Similarity:   u.Similarity,
		TopNeeds:     &u.TopNeeds,
	}
	if u.Experiences != nil {
		exps := make([]openapi.ModelsSimilarUserExperience, len(u.Experiences))
		for i, e := range u.Experiences {
			exps[i] = openapi.ModelsSimilarUserExperience{
				CompanyName: e.CompanyName,
				Title:       e.Title,
				IsCurrent:   e.IsCurrent,
			}
		}
		item.Experiences = &exps
	}
	return item
}
