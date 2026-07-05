package presenter

import (
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
)

type conversationResponse struct {
	ID               string    `json:"id"`
	ConversationType string    `json:"conversationType"`
	CompanyID        string    `json:"companyId"`
	CandidateID      string    `json:"candidateId"`
	CompanyName      string    `json:"companyName"`
	CandidateName    string    `json:"candidateName"`
	Participant1ID   string    `json:"participant1Id,omitempty"`
	Participant2ID   string    `json:"participant2Id,omitempty"`
	Participant1Name string    `json:"participant1Name,omitempty"`
	Participant2Name string    `json:"participant2Name,omitempty"`
	LastMessageBody  *string   `json:"lastMessageBody"`
	LastMessageAt    time.Time `json:"lastMessageAt"`
	UnreadCount      int       `json:"unreadCount"`
	CreatedAt        time.Time `json:"createdAt"`
}

type conversationListResponse struct {
	Items []*conversationResponse `json:"items"`
	Total int                     `json:"total"`
}

type messageResponse struct {
	ID             string                 `json:"id"`
	ConversationID string                 `json:"conversationId"`
	SenderType     string                 `json:"senderType"`
	SenderID       string                 `json:"senderId"`
	Body           string                 `json:"body"`
	MessageType    string                 `json:"messageType"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt      time.Time              `json:"createdAt"`
}

type messageListResponse struct {
	Items []*messageResponse `json:"items"`
	Total int                `json:"total"`
}

type messagingUnreadCountResponse struct {
	Count int `json:"count"`
}

// messagingConv is the goverter-generated conversation read-model→response mapper.
// See messaging_converter.go for its declaration.
var messagingConv messagingConverter = &messagingConverterImpl{}

// MessagingConversationResponse builds the single-conversation API response.
func MessagingConversationResponse(conv *messaging.ConversationWithPreview) any {
	return messagingConv.ToConversationResponse(conv)
}

// MessagingConversationsResponse builds the paginated conversation list API response.
func MessagingConversationsResponse(convs []*messaging.ConversationWithPreview, total int) any {
	return &conversationListResponse{Items: messagingConv.ToConversationResponses(convs), Total: total}
}

// MessagingMessageResponse builds the single-message API response.
func MessagingMessageResponse(msg *messaging.Message) any {
	return toMessageResponse(msg)
}

// MessagingMessagesResponse builds the paginated message list API response.
func MessagingMessagesResponse(msgs []*messaging.Message, total int) any {
	items := make([]*messageResponse, len(msgs))
	for i, m := range msgs {
		items[i] = toMessageResponse(m)
	}
	return &messageListResponse{Items: items, Total: total}
}

// MessagingUnreadCountResponse builds the unread-count API response.
func MessagingUnreadCountResponse(count int) any {
	return &messagingUnreadCountResponse{Count: count}
}

// MessagingOKResponse builds the fixed OK API response.
func MessagingOKResponse() any {
	return map[string]string{"status": "ok"}
}

func toMessageResponse(m *messaging.Message) *messageResponse {
	msgType := m.MessageType
	if msgType == "" {
		msgType = "text"
	}
	return &messageResponse{
		ID:             m.ID,
		ConversationID: m.ConversationID,
		SenderType:     m.SenderType,
		SenderID:       m.SenderID,
		Body:           m.Body,
		MessageType:    msgType,
		Metadata:       m.Metadata,
		CreatedAt:      m.CreatedAt,
	}
}
