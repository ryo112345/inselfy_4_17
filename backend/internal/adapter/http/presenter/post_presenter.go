package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/post"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type PostResponse struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Username  string    `json:"username"`
	Name      string    `json:"name"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type PostListResponse struct {
	Items []*PostResponse `json:"items"`
	Total int             `json:"total"`
}

type PostPresenter struct {
	single *PostResponse
	list   *PostListResponse
}

var _ port.PostOutputPort = (*PostPresenter)(nil)

func NewPostPresenter() *PostPresenter {
	return &PostPresenter{}
}

func (p *PostPresenter) PresentPost(_ context.Context, pw *post.PostWithUser) error {
	p.single = toPostResponse(pw)
	return nil
}

func (p *PostPresenter) PresentPosts(_ context.Context, posts []*post.PostWithUser, total int) error {
	items := make([]*PostResponse, len(posts))
	for i, pw := range posts {
		items[i] = toPostResponse(pw)
	}
	p.list = &PostListResponse{Items: items, Total: total}
	return nil
}

func (p *PostPresenter) SingleResponse() *PostResponse {
	return p.single
}

func (p *PostPresenter) ListResponse() *PostListResponse {
	return p.list
}

func toPostResponse(pw *post.PostWithUser) *PostResponse {
	return &PostResponse{
		ID:        pw.Post.ID,
		UserID:    pw.Post.UserID,
		Username:  pw.Username,
		Name:      pw.Name,
		Content:   pw.Post.Content,
		CreatedAt: pw.Post.CreatedAt,
		UpdatedAt: pw.Post.UpdatedAt,
	}
}
