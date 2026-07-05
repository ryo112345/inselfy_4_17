package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
)

// CareerInterestSessionResponse converts a session entity to its API response.
func CareerInterestSessionResponse(s *careerinterest.Session) any {
	items := make([]openapi.ModelsCIItemResponse, len(s.Items))
	for i, item := range s.Items {
		items[i] = openapi.ModelsCIItemResponse{
			QuestionNumber:  int32(item.QuestionNumber),
			ItemCode:        item.ItemCode,
			BasicInterestId: item.BasicInterestID,
			SkillLevel:      item.SkillLevel,
			ActivityType:    item.ActivityType,
			TextJa:          item.TextJa,
		}
	}
	return &openapi.ModelsCISessionResponse{
		Id:     s.ID,
		Status: s.Status,
		Items:  items,
	}
}

// CareerInterestResultResponse converts a result entity to its API response.
func CareerInterestResultResponse(r *careerinterest.Result) any {
	basicScores := make([]openapi.ModelsCIBasicScoreResponse, len(r.BasicScores))
	for i, s := range r.BasicScores {
		basicScores[i] = openapi.ModelsCIBasicScoreResponse{
			BasicInterestId: s.BasicInterestID,
			Score:           s.Score,
			Rank:            int32(s.Rank),
		}
	}

	typeScores := make([]openapi.ModelsCITypeScoreResponse, len(r.TypeScores))
	for i, s := range r.TypeScores {
		typeScores[i] = openapi.ModelsCITypeScoreResponse{
			TypeId: s.TypeID,
			Score:  s.Score,
			Rank:   int32(s.Rank),
		}
	}

	return &openapi.ModelsCIResultResponse{
		Id:          r.ID,
		SessionId:   r.SessionID,
		UserId:      r.UserID,
		BasicScores: basicScores,
		TypeScores:  typeScores,
		CreatedAt:   r.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
