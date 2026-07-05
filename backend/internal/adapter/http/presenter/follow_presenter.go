package presenter

import (
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/follow"
)

type FollowUserResponse struct {
	UserID    string    `json:"userId"`
	Username  string    `json:"username"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatarUrl"`
	Headline  *string   `json:"headline"`
	CreatedAt time.Time `json:"createdAt"`
}

type FollowUserListResponse struct {
	Items []*FollowUserResponse `json:"items"`
	Total int                   `json:"total"`
}

// FollowStatusResponse converts a follow status to its API response.
func FollowStatusResponse(status *follow.FollowStatus) any {
	return status
}

// FollowUsersResponse converts a list of follow users to their API response.
func FollowUsersResponse(users []*follow.FollowWithUser, total int) any {
	items := make([]*FollowUserResponse, len(users))
	for i, u := range users {
		items[i] = &FollowUserResponse{
			UserID:    u.UserID,
			Username:  u.Username,
			Name:      u.Name,
			AvatarURL: u.AvatarURL,
			Headline:  u.Headline,
			CreatedAt: u.CreatedAt,
		}
	}
	return &FollowUserListResponse{Items: items, Total: total}
}
