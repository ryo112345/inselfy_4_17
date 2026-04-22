package company

import (
	"regexp"
	"strings"
)

const (
	MaxEmailLength             = 255
	MaxCompanyNameLength       = 200
	MaxContactPersonNameLength = 100
	MaxPhoneNumberLength       = 30
	MinPasswordLength          = 8
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

func ValidateRegistration(input RegisterInput) error {
	email := strings.TrimSpace(input.Email)
	if email == "" {
		return ErrEmailRequired
	}
	if len([]rune(email)) > MaxEmailLength {
		return ErrEmailTooLong
	}
	if !emailRegex.MatchString(email) {
		return ErrInvalidEmail
	}

	if len([]rune(input.Password)) < MinPasswordLength {
		return ErrPasswordTooShort
	}

	companyName := strings.TrimSpace(input.CompanyName)
	if companyName == "" {
		return ErrCompanyNameRequired
	}
	if len([]rune(companyName)) > MaxCompanyNameLength {
		return ErrCompanyNameTooLong
	}

	contactName := strings.TrimSpace(input.ContactPersonName)
	if contactName == "" {
		return ErrContactPersonNameRequired
	}
	if len([]rune(contactName)) > MaxContactPersonNameLength {
		return ErrContactPersonNameTooLong
	}

	phone := strings.TrimSpace(input.PhoneNumber)
	if phone == "" {
		return ErrPhoneNumberRequired
	}
	if len([]rune(phone)) > MaxPhoneNumberLength {
		return ErrPhoneNumberTooLong
	}

	return nil
}
