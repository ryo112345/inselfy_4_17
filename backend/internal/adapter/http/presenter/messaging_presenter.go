package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/port"
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

type MessagingPresenter struct {
	conversation  *conversationResponse
	conversations *conversationListResponse
	message       *messageResponse
	messages      *messageListResponse
	unreadCount   *messagingUnreadCountResponse
	ok            bool
}

var _ port.MessagingOutputPort = (*MessagingPresenter)(nil)

func NewMessagingPresenter() *MessagingPresenter {
	return &MessagingPresenter{}
}

// messagingConv is the goverter-generated conversation read-model→response mapper.
// See messaging_converter.go for its declaration.
var messagingConv messagingConverter = &messagingConverterImpl{}

func (p *MessagingPresenter) PresentConversation(_ context.Context, conv *messaging.ConversationWithPreview) error {
	p.conversation = messagingConv.ToConversationResponse(conv)
	return nil
}

func (p *MessagingPresenter) PresentConversations(_ context.Context, convs []*messaging.ConversationWithPreview, total int) error {
	p.conversations = &conversationListResponse{Items: messagingConv.ToConversationResponses(convs), Total: total}
	return nil
}

func (p *MessagingPresenter) PresentMessage(_ context.Context, msg *messaging.Message) error {
	p.message = toMessageResponse(msg)
	return nil
}

func (p *MessagingPresenter) PresentMessages(_ context.Context, msgs []*messaging.Message, total int) error {
	items := make([]*messageResponse, len(msgs))
	for i, m := range msgs {
		items[i] = toMessageResponse(m)
	}
	p.messages = &messageListResponse{Items: items, Total: total}
	return nil
}

func (p *MessagingPresenter) PresentUnreadCount(_ context.Context, count int) error {
	p.unreadCount = &messagingUnreadCountResponse{Count: count}
	return nil
}

func (p *MessagingPresenter) PresentOK(_ context.Context) error {
	p.ok = true
	return nil
}

func (p *MessagingPresenter) ConversationResponse() interface{}     { return p.conversation }
func (p *MessagingPresenter) ConversationListResponse() interface{} { return p.conversations }
func (p *MessagingPresenter) MessageResponse() interface{}          { return p.message }
func (p *MessagingPresenter) MessageListResponse() interface{}      { return p.messages }
func (p *MessagingPresenter) UnreadCountResponse() interface{}      { return p.unreadCount }
func (p *MessagingPresenter) OKResponse() interface{}               { return map[string]string{"status": "ok"} }

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
