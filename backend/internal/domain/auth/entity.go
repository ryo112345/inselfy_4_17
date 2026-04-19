package auth

import "time"

type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

type GoogleClaims struct {
	Sub     string
	Email   string
	Name    string
	Picture string
}

type RefreshToken struct {
	ID        string
	UserID    string
	TokenHash string
	ExpiresAt time.Time
	CreatedAt time.Time
	RevokedAt *time.Time
}
