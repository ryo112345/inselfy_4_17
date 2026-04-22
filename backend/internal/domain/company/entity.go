package company

import "time"

type Status string

const (
	StatusPending  Status = "pending"
	StatusApproved Status = "approved"
	StatusRejected Status = "rejected"
)

type CompanyAccount struct {
	ID                string
	Email             string
	PasswordHash      string
	CompanyName       string
	ContactPersonName string
	PhoneNumber       string
	Status            Status
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type RegisterInput struct {
	Email             string
	Password          string
	CompanyName       string
	ContactPersonName string
	PhoneNumber       string
}

type CompanyRefreshToken struct {
	ID        string
	CompanyID string
	TokenHash string
	ExpiresAt time.Time
	CreatedAt time.Time
	RevokedAt *time.Time
}
