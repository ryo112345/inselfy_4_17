package messaging

import "time"

type Conversation struct {
	ID            string
	CompanyID     string
	CandidateID   string
	LastMessageAt time.Time
	CreatedAt     time.Time
}

type ConversationWithPreview struct {
	Conversation
	CompanyName     string
	CandidateName   string
	LastMessageBody *string
	UnreadCount     int
}

type Message struct {
	ID             string
	ConversationID string
	SenderType     string
	SenderID       string
	Body           string
	CreatedAt      time.Time
}

type ConversationParticipant struct {
	ID              string
	ConversationID  string
	ParticipantType string
	ParticipantID   string
	LastReadAt      time.Time
}

type SendMessageInput struct {
	ConversationID string
	SenderType     string
	SenderID       string
	Body           string
}

type StartConversationInput struct {
	CompanyID   string
	CandidateID string
	SenderType  string
	SenderID    string
	Body        string
}
