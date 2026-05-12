package post

import "time"

type Post struct {
	ID          string
	UserID      string
	Content     string
	QuotePostID string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type QuotedPost struct {
	ID        string
	Content   string
	Username  string
	Name      string
	CreatedAt time.Time
}

type CreatePostInput struct {
	UserID      string
	Content     string
	QuotePostID string
}

type PostWithUser struct {
	Post         Post
	Username     string
	Name         string
	LikeCount    int
	CommentCount int
	RepostCount  int
	LikedByMe   bool
	RepostedByMe bool
	IsRepost     bool
	QuotedPost   *QuotedPost
}

type Comment struct {
	ID        string
	PostID    string
	UserID    string
	Content   string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type CommentWithUser struct {
	Comment  Comment
	Username string
	Name     string
}

type CreateCommentInput struct {
	PostID  string
	UserID  string
	Content string
}
