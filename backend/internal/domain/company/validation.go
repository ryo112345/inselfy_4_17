package company

import (
	"regexp"
	"strings"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
)

const (
	MaxEmailLength             = 255
	MaxCompanyNameLength       = 200
	MaxContactPersonNameLength = 100
	MaxPhoneNumberLength       = 30
	MinPasswordLength          = 8

	// Profile limits. Keep in sync with api-schema/typespec/models/company-profile.tsp.
	MaxHeadlineLength           = 255
	MaxProfileDescriptionLength = 10000
	MaxIndustryLength           = 100
	MaxProfileLocationLength    = 255
	MaxEmployeeCountLength      = 50
	MaxWebsiteURLLength         = 500
	MaxRepresentativeNameLength = 100
	MaxCapitalLength            = 100
	MaxRevenueLength            = 100
	MaxBenefits                 = 50
	MaxBenefitLength            = 255
	MaxAverageAgeLength         = 50
	MaxOvertimeHoursLength      = 50
	MaxPaidLeaveRateLength      = 50
	MaxSmokingPolicyLength      = 255
	MinFoundedYear              = 1800
	MaxFoundedYear              = 2100
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

// ValidateUpdateProfile checks the editable profile fields.
func ValidateUpdateProfile(input UpdateProfileInput) error {
	if strings.TrimSpace(input.CompanyName) == "" {
		return domainerr.NewValidation("企業名は必須です")
	}

	for _, f := range []struct {
		name  string
		value string
		limit int
	}{
		{"companyName", input.CompanyName, MaxCompanyNameLength},
		{"contactPersonName", input.ContactPersonName, MaxContactPersonNameLength},
		{"phoneNumber", input.PhoneNumber, MaxPhoneNumberLength},
		{"headline", input.Headline, MaxHeadlineLength},
		{"description", input.Description, MaxProfileDescriptionLength},
		{"industry", input.Industry, MaxIndustryLength},
		{"location", input.Location, MaxProfileLocationLength},
		{"employeeCount", input.EmployeeCount, MaxEmployeeCountLength},
		{"websiteUrl", input.WebsiteURL, MaxWebsiteURLLength},
		{"representativeName", input.RepresentativeName, MaxRepresentativeNameLength},
		{"capital", input.Capital, MaxCapitalLength},
		{"revenue", input.Revenue, MaxRevenueLength},
		{"averageAge", input.AverageAge, MaxAverageAgeLength},
		{"averageOvertimeHours", input.AverageOvertimeHours, MaxOvertimeHoursLength},
		{"paidLeaveRate", input.PaidLeaveRate, MaxPaidLeaveRateLength},
		{"smokingPolicy", input.SmokingPolicy, MaxSmokingPolicyLength},
	} {
		if len([]rune(f.value)) > f.limit {
			return domainerr.NewValidation("%s は %d 文字以下にしてください", f.name, f.limit)
		}
	}

	if len(input.Benefits) > MaxBenefits {
		return domainerr.NewValidation("benefits は最大 %d 件です", MaxBenefits)
	}
	for _, b := range input.Benefits {
		if len([]rune(b)) > MaxBenefitLength {
			return domainerr.NewValidation("benefits の各項目は %d 文字以下にしてください", MaxBenefitLength)
		}
	}

	if input.FoundedYear != nil && (*input.FoundedYear < MinFoundedYear || *input.FoundedYear > MaxFoundedYear) {
		return domainerr.NewValidation("foundedYear は %d〜%d の範囲で指定してください", MinFoundedYear, MaxFoundedYear)
	}
	if input.FoundedMonth != nil && (*input.FoundedMonth < 1 || *input.FoundedMonth > 12) {
		return domainerr.NewValidation("foundedMonth は 1〜12 の範囲で指定してください")
	}

	return nil
}
