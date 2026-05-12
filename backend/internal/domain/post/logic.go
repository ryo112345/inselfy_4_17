package post

import "errors"

const (
	MaxContentLength        = 280
	MaxCommentContentLength = 500
)

var (
	ErrContentRequired        = errors.New("content is required")
	ErrContentTooLong         = errors.New("content must be 280 characters or fewer")
	ErrCommentContentRequired = errors.New("comment content is required")
	ErrCommentContentTooLong  = errors.New("comment must be 500 characters or fewer")
)

func ValidateCreate(input CreatePostInput) error {
	if len(input.Content) == 0 {
		return ErrContentRequired
	}
	if len([]rune(input.Content)) > MaxContentLength {
		return ErrContentTooLong
	}
	return nil
}

func ValidateComment(input CreateCommentInput) error {
	if len(input.Content) == 0 {
		return ErrCommentContentRequired
	}
	if len([]rune(input.Content)) > MaxCommentContentLength {
		return ErrCommentContentTooLong
	}
	return nil
}
