package post

import "errors"

const (
	MaxContentLength = 280
)

var (
	ErrContentRequired = errors.New("content is required")
	ErrContentTooLong  = errors.New("content must be 280 characters or fewer")
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
