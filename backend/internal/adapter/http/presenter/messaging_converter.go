package presenter

import "github.com/akiyama/inselfy/backend/internal/domain/messaging"

// messagingConverter declares the conversation read-model→response mapping.
// Only the conversation mapper is generated; toMessageResponse stays hand-written
// because it applies a default ("" -> "text") that goverter cannot express
// without a per-field function. Run `make goverter` to regenerate.
//
// goverter:converter
// goverter:output:file ./messaging_converter.gen.go
// goverter:output:package github.com/akiyama/inselfy/backend/internal/adapter/http/presenter
// goverter:extend copyTime
type messagingConverter interface {
	// goverter:autoMap Conversation
	ToConversationResponse(c *messaging.ConversationWithPreview) *conversationResponse
	ToConversationResponses(cs []*messaging.ConversationWithPreview) []*conversationResponse
}
