package post

import "time"

type Post struct {
	ID        string
	UserID    string
	Content   string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type CreatePostInput struct {
	UserID  string
	Content string
}

type PostWithUser struct {
	Post     Post
	Username string
	Name     string
}
