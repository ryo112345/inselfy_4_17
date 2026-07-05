package presenter

import "github.com/akiyama/inselfy/backend/internal/domain/post"

// postConverter declares the post/comment read-model→response mappings.
// Run `make goverter` to regenerate.
//
// goverter:converter
// goverter:output:file ./post_converter.gen.go
// goverter:output:package github.com/akiyama/inselfy/backend/internal/adapter/http/presenter
// goverter:extend copyTime
type postConverter interface {
	// goverter:autoMap Post
	ToPostResponse(pw *post.PostWithUser) *PostResponse
	// goverter:autoMap Comment
	ToCommentResponse(cw *post.CommentWithUser) *CommentResponse
}
