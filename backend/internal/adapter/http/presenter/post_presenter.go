package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/post"
)

var postConv postConverter = &postConverterImpl{}

// PostSingleResponse converts a single post to its API response.
func PostSingleResponse(pw *post.PostWithUser) any { return postConv.ToPostResponse(pw) }

// PostsListResponse converts a paginated list of posts to its API response.
func PostsListResponse(posts []*post.PostWithUser, total int) any {
	items := make([]openapi.ModelsPostResponse, len(posts))
	for i, pw := range posts {
		items[i] = *postConv.ToPostResponse(pw)
	}
	return &openapi.ModelsPostListResponse{Items: items, Total: total}
}

// PostLikeToggleResponse builds the like-toggle API response.
func PostLikeToggleResponse(liked bool, count int) any {
	return &openapi.ModelsLikeToggleResponse{Liked: liked, Count: count}
}

// PostRepostToggleResponse builds the repost-toggle API response.
func PostRepostToggleResponse(reposted bool, count int) any {
	return &openapi.ModelsRepostToggleResponse{Reposted: reposted, Count: count}
}

// PostCommentResponse converts a single comment to its API response.
func PostCommentResponse(c *post.CommentWithUser) any { return postConv.ToCommentResponse(c) }

// PostCommentsListResponse converts a paginated list of comments to its API response.
func PostCommentsListResponse(comments []*post.CommentWithUser, total int) any {
	items := make([]openapi.ModelsCommentResponse, len(comments))
	for i, c := range comments {
		items[i] = *postConv.ToCommentResponse(c)
	}
	return &openapi.ModelsCommentListResponse{Items: items, Total: total}
}
