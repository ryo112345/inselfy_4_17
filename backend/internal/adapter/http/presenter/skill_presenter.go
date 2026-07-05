package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/skill"
)

// SkillResponse converts a single user-skill to its API response.
func SkillResponse(s *skill.UserSkill) any { return toSkillResponse(s) }

// SkillsResponse converts a list of user-skills to its API response.
func SkillsResponse(ss []*skill.UserSkill) any {
	items := make([]openapi.ModelsSkillResponse, 0, len(ss))
	for _, s := range ss {
		items = append(items, *toSkillResponse(s))
	}
	return &openapi.ModelsSkillListResponse{Items: items}
}

func toSkillResponse(s *skill.UserSkill) *openapi.ModelsSkillResponse {
	return &openapi.ModelsSkillResponse{
		Id:         s.ID,
		Name:       s.Name,
		AttachedAt: s.AttachedAt,
	}
}
