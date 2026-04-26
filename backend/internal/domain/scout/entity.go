package scout

import "time"

type Status string

const (
	StatusDraft      Status = "draft"
	StatusSent       Status = "sent"
	StatusOpened     Status = "opened"
	StatusReplied    Status = "replied"
	StatusInterested Status = "interested"
	StatusDeclined   Status = "declined"
	StatusExpired    Status = "expired"
)

type QualityLevel string

const (
	QualityGood       QualityLevel = "good"
	QualityWarning    QualityLevel = "warning"
	QualityRestricted QualityLevel = "restricted"
)

type CandidateResponse string

const (
	ResponseInterested CandidateResponse = "interested"
	ResponseDeclined   CandidateResponse = "declined"
)

type ScoutMessage struct {
	ID           string
	CompanyID    string
	CandidateID  string
	JobPostingID *string
	TemplateID   *string
	Subject      string
	Body         string
	Status       Status
	SentAt       *time.Time
	OpenedAt     *time.Time
	RepliedAt    *time.Time
	ExpiresAt    *time.Time
	ResendCount  int16
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type ScoutMessageWithNames struct {
	ScoutMessage
	CompanyName   string
	CandidateName string
	JobTitle      *string
}

type SendScoutInput struct {
	CompanyID    string
	CandidateID  string
	JobPostingID *string
	TemplateID   *string
	Subject      string
	Body         string
}

type ScoutTemplate struct {
	ID        string
	CompanyID string
	Name      string
	Subject   string
	Body      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type CreateTemplateInput struct {
	CompanyID string
	Name      string
	Subject   string
	Body      string
}

type UpdateTemplateInput struct {
	Name    string
	Subject string
	Body    string
}

type ScoutCredit struct {
	ID                string
	CompanyID         string
	Balance           int
	MonthlyAllowance  int
	MaxStock          int
	LastReplenishedAt time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type CreditLedgerEntry struct {
	ID             string
	CompanyID      string
	Delta          int
	Reason         string
	ScoutMessageID *string
	BalanceAfter   int
	CreatedAt      time.Time
}

type ScoutReply struct {
	ID             string
	ScoutMessageID string
	SenderType     string
	SenderID       string
	Body           string
	CreatedAt      time.Time
}

type UserScoutSettings struct {
	UserID          string
	AcceptingScouts bool
	UpdatedAt       time.Time
}

type QualityScore struct {
	ReplyRate14d   float64
	Level          QualityLevel
	SentLast14d    int
	RepliedLast14d int
}
