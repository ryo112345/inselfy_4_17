package notification

import "time"

type Type string

const (
	TypeScoutReceived     Type = "scout_received"
	TypeScoutReplied      Type = "scout_replied"
	TypeScoutInterested   Type = "scout_interested"
	TypeScoutDeclined     Type = "scout_declined"
	TypeScoutExpired      Type = "scout_expired"
	TypeCreditReplenished Type = "credit_replenished"
	TypeQualityWarning    Type = "quality_warning"
)

type Notification struct {
	ID          string
	UserID      *string
	CompanyID   *string
	Type        Type
	Title       string
	Body        string
	ReferenceID *string
	IsRead      bool
	CreatedAt   time.Time
}
