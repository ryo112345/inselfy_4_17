package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
)

// messagingConv is the goverter-generated conversation read-model→response mapper.
// See messaging_converter.go for its declaration.
var messagingConv messagingConverter = &messagingConverterImpl{}

// MessagingConversationResponse builds the single-conversation API response.
func MessagingConversationResponse(conv *messaging.ConversationWithPreview) any {
	return messagingConv.ToConversationResponse(conv)
}

// MessagingConversationsResponse builds the paginated conversation list API response.
func MessagingConversationsResponse(convs []*messaging.ConversationWithPreview, total int) any {
	items := make([]openapi.ModelsConversationResponse, 0, len(convs))
	for _, c := range messagingConv.ToConversationResponses(convs) {
		items = append(items, *c)
	}
	return &openapi.ModelsConversationListResponse{Items: items, Total: total}
}

// MessagingMessageResponse builds the single-message API response.
func MessagingMessageResponse(msg *messaging.Message) any {
	return toMessageResponse(msg)
}

// MessagingMessagesResponse builds the paginated message list API response.
func MessagingMessagesResponse(msgs []*messaging.Message, total int) any {
	items := make([]openapi.ModelsMessageResponse, len(msgs))
	for i, m := range msgs {
		items[i] = *toMessageResponse(m)
	}
	return &openapi.ModelsMessageListResponse{Items: items, Total: total}
}

// MessagingUnreadCountResponse builds the unread-count API response.
func MessagingUnreadCountResponse(count int) any {
	return &openapi.ModelsUnreadCountResponse{Count: int32(count)}
}

// MessagingOKResponse builds the fixed OK API response.
func MessagingOKResponse() any {
	return &openapi.ModelsStatusOkResponse{Status: "ok"}
}

func toMessageResponse(m *messaging.Message) *openapi.ModelsMessageResponse {
	msgType := m.MessageType
	if msgType == "" {
		msgType = "text"
	}
	resp := &openapi.ModelsMessageResponse{
		Id:             m.ID,
		ConversationId: m.ConversationID,
		SenderType:     m.SenderType,
		SenderId:       m.SenderID,
		Body:           m.Body,
		MessageType:    msgType,
		CreatedAt:      m.CreatedAt,
	}
	if len(m.Metadata) > 0 {
		resp.Metadata = &m.Metadata
	}
	return resp
}
