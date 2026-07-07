package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
)

// TalentCardResponse converts the talent-search read model into the shared
// talent-card API response.
func TalentCardResponse(c talentsearch.Card) openapi.ModelsTalentCard {
	exps := make([]openapi.ModelsTalentExperience, len(c.Experiences))
	for i, e := range c.Experiences {
		exps[i] = openapi.ModelsTalentExperience{CompanyName: e.CompanyName, Title: e.Title}
	}
	return openapi.ModelsTalentCard{
		UserId:              c.UserID,
		Username:            c.Username,
		Name:                c.Name,
		Headline:            c.Headline,
		AvatarUrl:           c.AvatarURL,
		ProfileColor:        c.ProfileColor,
		JobSeekingStatus:    c.JobSeekingStatus,
		Skills:              c.Skills,
		Experiences:         exps,
		TopWvLabels:         c.TopWVLabels,
		TopCiLabels:         c.TopCILabels,
		Similarity:          c.Similarity,
		WvSimilarity:        c.WVSimilarity,
		CiSimilarity:        c.CISimilarity,
		IntegratedSimilarity: c.IntSimilarity,
	}
}

// TalentListResponse builds the shared talent-list API response.
func TalentListResponse(cards []talentsearch.Card, total int) *openapi.ModelsTalentListResponse {
	users := make([]openapi.ModelsTalentCard, len(cards))
	for i, c := range cards {
		users[i] = TalentCardResponse(c)
	}
	return &openapi.ModelsTalentListResponse{Items: users, Total: int32(total)}
}
