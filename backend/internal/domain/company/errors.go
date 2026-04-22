package company

import "errors"

var (
	ErrEmailAlreadyRegistered    = errors.New("this email is already registered")
	ErrInvalidCredentials        = errors.New("invalid email or password")
	ErrAccountPending            = errors.New("your account is awaiting admin approval")
	ErrAccountRejected           = errors.New("your account registration has been rejected")
	ErrEmailRequired             = errors.New("email is required")
	ErrInvalidEmail              = errors.New("invalid email format")
	ErrPasswordTooShort          = errors.New("password must be at least 8 characters")
	ErrCompanyNameRequired       = errors.New("company name is required")
	ErrContactPersonNameRequired = errors.New("contact person name is required")
	ErrPhoneNumberRequired       = errors.New("phone number is required")
	ErrCompanyNameTooLong        = errors.New("company name must be 200 characters or fewer")
	ErrContactPersonNameTooLong  = errors.New("contact person name must be 100 characters or fewer")
	ErrPhoneNumberTooLong        = errors.New("phone number must be 30 characters or fewer")
	ErrEmailTooLong              = errors.New("email must be 255 characters or fewer")
)
