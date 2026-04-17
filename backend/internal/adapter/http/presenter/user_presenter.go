// Package presenter contains HTTP presenters that implement output ports.
package presenter

import (
	"context"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// UserPresenter converts a domain user to the generated OpenAPI response type.
type UserPresenter struct {
	response *openapi.ModelsUserResponse
}

var _ port.UserOutputPort = (*UserPresenter)(nil)

// NewUserPresenter creates a UserPresenter.
func NewUserPresenter() *UserPresenter {
	return &UserPresenter{}
}

// PresentUser stores the converted user response.
func (p *UserPresenter) PresentUser(_ context.Context, u *user.User) error {
	p.response = &openapi.ModelsUserResponse{
		Id:               u.ID,
		Username:         u.Username.String(),
		Name:             u.Name,
		DisplayName:      u.DisplayName,
		Headline:         u.Headline,
		Location:         u.Location,
		About:            u.About,
		Industry:         u.Industry,
		JobType:          u.JobType,
		JobSeekingStatus: u.JobSeekingStatus,
		ProfileColor:     u.ProfileColor,
		IsPublic:         u.IsPublic,
		CreatedAt:        u.CreatedAt,
		UpdatedAt:        u.UpdatedAt,
	}
	return nil
}

// Response returns the last converted user response.
func (p *UserPresenter) Response() *openapi.ModelsUserResponse {
	return p.response
}
