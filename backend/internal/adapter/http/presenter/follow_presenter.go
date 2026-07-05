package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/follow"
)

// FollowStatusResponse converts a follow status to its API response.
func FollowStatusResponse(status *follow.FollowStatus) any {
	return &openapi.ModelsFollowStatusResponse{
		Following:  status.Following,
		FollowedBy: status.FollowedBy,
	}
}

// FollowUsersResponse converts a list of follow users to their API response.
func FollowUsersResponse(users []*follow.FollowWithUser, total int) any {
	items := make([]openapi.ModelsFollowUserResponse, len(users))
	for i, u := range users {
		items[i] = openapi.ModelsFollowUserResponse{
			UserId:    u.UserID,
			Username:  u.Username,
			Name:      u.Name,
			AvatarUrl: u.AvatarURL,
			Headline:  u.Headline,
			CreatedAt: u.CreatedAt,
		}
	}
	return &openapi.ModelsFollowUserListResponse{Items: items, Total: int32(total)}
}
