package presenter

import (
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/post"
)

type PostResponse struct {
	ID           string              `json:"id"`
	UserID       string              `json:"userId"`
	Username     string              `json:"username"`
	Name         string              `json:"name"`
	Content      string              `json:"content"`
	LikeCount    int                 `json:"likeCount"`
	CommentCount int                 `json:"commentCount"`
	RepostCount  int                 `json:"repostCount"`
	LikedByMe    bool                `json:"likedByMe"`
	RepostedByMe bool                `json:"repostedByMe"`
	IsRepost     bool                `json:"isRepost"`
	QuotedPost   *QuotedPostResponse `json:"quotedPost,omitempty"`
	CreatedAt    time.Time           `json:"createdAt"`
	UpdatedAt    time.Time           `json:"updatedAt"`
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

// PostSingleResponse converts a single post to its API response.
func PostSingleResponse(pw *post.PostWithUser) any { return toPostResponse(pw) }

// PostsListResponse converts a paginated list of posts to its API response.
func PostsListResponse(posts []*post.PostWithUser, total int) any {
	items := make([]*PostResponse, len(posts))
	for i, pw := range posts {
		items[i] = toPostResponse(pw)
	}
	return &PostListResponse{Items: items, Total: total}
}

// PostLikeToggleResponse builds the like-toggle API response.
func PostLikeToggleResponse(liked bool, count int) any {
	return &LikeToggleResponse{Liked: liked, Count: count}
}

// PostRepostToggleResponse builds the repost-toggle API response.
func PostRepostToggleResponse(reposted bool, count int) any {
	return &RepostToggleResponse{Reposted: reposted, Count: count}
}

// PostCommentResponse converts a single comment to its API response.
func PostCommentResponse(c *post.CommentWithUser) any { return toCommentResponse(c) }

// PostCommentsListResponse converts a paginated list of comments to its API response.
func PostCommentsListResponse(comments []*post.CommentWithUser, total int) any {
	items := make([]*CommentResponse, len(comments))
	for i, c := range comments {
		items[i] = toCommentResponse(c)
	}
	return &CommentListResponse{Items: items, Total: total}
}

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
		LikedByMe:    pw.LikedByMe,
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
