package messaging

import "strings"

const MaxBodyLength = 5000

func ValidateMessageBody(body string) error {
	b := strings.TrimSpace(body)
	if b == "" {
		return ErrBodyRequired
	}
	if len([]rune(b)) > MaxBodyLength {
		return ErrBodyTooLong
	}
	return nil
}
