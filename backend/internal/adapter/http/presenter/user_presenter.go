// Package presenter contains HTTP presenters that implement output ports.
package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
)

// UserResponse converts a domain user to the generated OpenAPI response type.
func UserResponse(u *user.User) any {
	return &openapi.ModelsUserResponse{
		Id:               u.ID,
		Username:         u.Username.String(),
		Name:             u.Name,
		Headline:         u.Headline,
		Location:         u.Location,
		About:            u.About,
		Industry:         u.Industry,
		JobType:          u.JobType,
		JobSeekingStatus: u.JobSeekingStatus,
		ProfileColor:     u.ProfileColor,
		AvatarUrl:        u.AvatarURL,
		CoverPhotoUrl:    u.CoverPhotoURL,
		IsPublic:         u.IsPublic,
		CreatedAt:        u.CreatedAt,
		UpdatedAt:        u.UpdatedAt,
	}
}
