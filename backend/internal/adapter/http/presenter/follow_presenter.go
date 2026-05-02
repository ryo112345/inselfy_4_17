package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/follow"
	"github.com/akiyama/inselfy/backend/internal/port"
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

type FollowPresenter struct {
	status *follow.FollowStatus
	list   *FollowUserListResponse
	ok     bool
}

var _ port.FollowOutputPort = (*FollowPresenter)(nil)

func NewFollowPresenter() *FollowPresenter {
	return &FollowPresenter{}
}

func (p *FollowPresenter) PresentFollowStatus(_ context.Context, status *follow.FollowStatus) error {
	p.status = status
	return nil
}

func (p *FollowPresenter) PresentFollowUsers(_ context.Context, users []*follow.FollowWithUser, total int) error {
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
	p.list = &FollowUserListResponse{Items: items, Total: total}
	return nil
}

func (p *FollowPresenter) PresentOK(_ context.Context) error {
	p.ok = true
	return nil
}

func (p *FollowPresenter) StatusResponse() *follow.FollowStatus {
	return p.status
}

func (p *FollowPresenter) ListResponse() *FollowUserListResponse {
	return p.list
}

func (p *FollowPresenter) IsOK() bool {
	return p.ok
}
