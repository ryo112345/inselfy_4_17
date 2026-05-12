package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/post"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type PostResponse struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	Username     string    `json:"username"`
	Name         string    `json:"name"`
	Content      string    `json:"content"`
	LikeCount    int       `json:"likeCount"`
	CommentCount int       `json:"commentCount"`
	RepostCount  int       `json:"repostCount"`
	LikedByMe   bool      `json:"likedByMe"`
	RepostedByMe bool      `json:"repostedByMe"`
	IsRepost     bool               `json:"isRepost"`
	QuotedPost   *QuotedPostResponse `json:"quotedPost,omitempty"`
	CreatedAt    time.Time          `json:"createdAt"`
	UpdatedAt    time.Time          `json:"updatedAt"`
}

type QuotedPostResponse struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	Username  string    `json:"username"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
}

type PostListResponse struct {
	Items []*PostResponse `json:"items"`
	Total int             `json:"total"`
}

type LikeToggleResponse struct {
	Liked bool `json:"liked"`
	Count int  `json:"count"`
}

type CommentResponse struct {
	ID        string    `json:"id"`
	PostID    string    `json:"postId"`
	UserID    string    `json:"userId"`
	Username  string    `json:"username"`
	Name      string    `json:"name"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

type CommentListResponse struct {
	Items []*CommentResponse `json:"items"`
	Total int                `json:"total"`
}

type RepostToggleResponse struct {
	Reposted bool `json:"reposted"`
	Count    int  `json:"count"`
}

type PostPresenter struct {
	single       *PostResponse
	list         *PostListResponse
	likeToggle   *LikeToggleResponse
	repostToggle *RepostToggleResponse
	comment      *CommentResponse
	commentList  *CommentListResponse
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

func (p *PostPresenter) PresentLikeToggle(_ context.Context, liked bool, count int) error {
	p.likeToggle = &LikeToggleResponse{Liked: liked, Count: count}
	return nil
}

func (p *PostPresenter) PresentRepostToggle(_ context.Context, reposted bool, count int) error {
	p.repostToggle = &RepostToggleResponse{Reposted: reposted, Count: count}
	return nil
}

func (p *PostPresenter) PresentComment(_ context.Context, c *post.CommentWithUser) error {
	p.comment = toCommentResponse(c)
	return nil
}

func (p *PostPresenter) PresentComments(_ context.Context, comments []*post.CommentWithUser, total int) error {
	items := make([]*CommentResponse, len(comments))
	for i, c := range comments {
		items[i] = toCommentResponse(c)
	}
	p.commentList = &CommentListResponse{Items: items, Total: total}
	return nil
}

func (p *PostPresenter) SingleResponse() *PostResponse       { return p.single }
func (p *PostPresenter) ListResponse() *PostListResponse     { return p.list }
func (p *PostPresenter) LikeToggleResponse() *LikeToggleResponse     { return p.likeToggle }
func (p *PostPresenter) RepostToggleResponse() *RepostToggleResponse { return p.repostToggle }
func (p *PostPresenter) CommentResponse() *CommentResponse       { return p.comment }
func (p *PostPresenter) CommentListResponse() *CommentListResponse { return p.commentList }

func toPostResponse(pw *post.PostWithUser) *PostResponse {
	r := &PostResponse{
		ID:           pw.Post.ID,
		UserID:       pw.Post.UserID,
		Username:     pw.Username,
		Name:         pw.Name,
		Content:      pw.Post.Content,
		LikeCount:    pw.LikeCount,
		CommentCount: pw.CommentCount,
		RepostCount:  pw.RepostCount,
		LikedByMe:   pw.LikedByMe,
		RepostedByMe: pw.RepostedByMe,
		IsRepost:     pw.IsRepost,
		CreatedAt:    pw.Post.CreatedAt,
		UpdatedAt:    pw.Post.UpdatedAt,
	}
	if pw.QuotedPost != nil {
		r.QuotedPost = &QuotedPostResponse{
			ID:        pw.QuotedPost.ID,
			Content:   pw.QuotedPost.Content,
			Username:  pw.QuotedPost.Username,
			Name:      pw.QuotedPost.Name,
			CreatedAt: pw.QuotedPost.CreatedAt,
		}
	}
	return r
}

func toCommentResponse(cw *post.CommentWithUser) *CommentResponse {
	return &CommentResponse{
		ID:        cw.Comment.ID,
		PostID:    cw.Comment.PostID,
		UserID:    cw.Comment.UserID,
		Username:  cw.Username,
		Name:      cw.Name,
		Content:   cw.Comment.Content,
		CreatedAt: cw.Comment.CreatedAt,
	}
}
