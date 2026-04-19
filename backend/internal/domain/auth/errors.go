package auth

import "errors"

var (
	ErrInvalidGoogleToken  = errors.New("invalid google token")
	ErrTokenExpired        = errors.New("token expired")
	ErrRefreshTokenRevoked = errors.New("refresh token revoked or expired")
	ErrUnauthorized        = errors.New("unauthorized")
)
