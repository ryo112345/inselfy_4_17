package messaging

import "errors"

var (
	ErrBodyRequired        = errors.New("message body is required")
	ErrBodyTooLong         = errors.New("message body must be 5000 characters or fewer")
	ErrNotParticipant      = errors.New("not a participant of this conversation")
	ErrConversationExists  = errors.New("conversation already exists")
	ErrSelfConversation    = errors.New("cannot send a message to yourself")
)
