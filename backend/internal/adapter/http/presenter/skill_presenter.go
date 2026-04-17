package presenter

import (
	"context"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/skill"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// SkillPresenter converts a domain user-skill to the generated OpenAPI response type.
type SkillPresenter struct {
	single *openapi.ModelsSkillResponse
	list   *openapi.ModelsSkillListResponse
}

var _ port.SkillOutputPort = (*SkillPresenter)(nil)

// NewSkillPresenter creates a SkillPresenter.
func NewSkillPresenter() *SkillPresenter {
	return &SkillPresenter{}
}

func (p *SkillPresenter) PresentSkill(_ context.Context, s *skill.UserSkill) error {
	p.single = toSkillResponse(s)
	return nil
}

func (p *SkillPresenter) PresentSkills(_ context.Context, ss []*skill.UserSkill) error {
	items := make([]openapi.ModelsSkillResponse, 0, len(ss))
	for _, s := range ss {
		items = append(items, *toSkillResponse(s))
	}
	p.list = &openapi.ModelsSkillListResponse{Items: items}
	return nil
}

func (p *SkillPresenter) Single() *openapi.ModelsSkillResponse { return p.single }
func (p *SkillPresenter) List() *openapi.ModelsSkillListResponse {
	return p.list
}

func toSkillResponse(s *skill.UserSkill) *openapi.ModelsSkillResponse {
	return &openapi.ModelsSkillResponse{
		Id:         s.ID,
		Name:       s.Name,
		AttachedAt: s.AttachedAt,
	}
}
