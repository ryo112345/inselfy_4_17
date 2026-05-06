package messaging

import "time"

type Conversation struct {
	ID               string
	ConversationType string // "company_candidate" or "candidate_candidate"
	CompanyID        string
	CandidateID      string
	Participant1ID   string
	Participant2ID   string
	LastMessageAt    time.Time
	CreatedAt        time.Time
}

type ConversationWithPreview struct {
	Conversation
	CompanyName      string
	CandidateName    string
	Participant1Name string
	Participant2Name string
	LastMessageBody  *string
	UnreadCount      int
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

type StartCandidateConversationInput struct {
	SenderID    string
	RecipientID string
	Body        string
}
