package experience

import (
	"errors"
	"strings"
	"time"
)

const (
	MaxPerUser                 = 50
	MaxCompanyNameLength       = 200
	MaxTitleLength             = 200
	MaxDescriptionLength       = 5000
	MinYear              int16 = 1950
)

var (
	ErrCompanyNameRequired  = errors.New("company_name is required")
	ErrCompanyNameTooLong   = errors.New("company_name must be 200 characters or fewer")
	ErrTitleRequired        = errors.New("title is required")
	ErrTitleTooLong         = errors.New("title must be 200 characters or fewer")
	ErrDescriptionTooLong   = errors.New("description must be 5000 characters or fewer")
	ErrStartYearOutOfRange  = errors.New("start_year must be between 1950 and next year")
	ErrStartMonthOutOfRange = errors.New("start_month must be between 1 and 12")
	ErrEndYearOutOfRange    = errors.New("end_year must be between 1950 and next year")
	ErrEndMonthOutOfRange   = errors.New("end_month must be between 1 and 12")
	ErrCurrentHasEnd        = errors.New("end_year/end_month must be null when is_current is true")
	ErrEndedMissingEnd      = errors.New("end_year/end_month are required when is_current is false")
	ErrEndBeforeStart       = errors.New("end date must be on or after start date")
	ErrTooManyEntries       = errors.New("experiences are limited to 50 per user")
)

// ValidateCreate validates a new experience for insertion.
func ValidateCreate(input CreateInput) error {
	return validateCore(
		input.CompanyName,
		input.Title,
		input.StartYear,
		input.StartMonth,
		input.EndYear,
		input.EndMonth,
		input.IsCurrent,
		input.Description,
	)
}

// ValidateUpdate validates an experience update.
func ValidateUpdate(input UpdateInput) error {
	return validateCore(
		input.CompanyName,
		input.Title,
		input.StartYear,
		input.StartMonth,
		input.EndYear,
		input.EndMonth,
		input.IsCurrent,
		input.Description,
	)
}

func validateCore(
	companyName, title string,
	startYear, startMonth int16,
	endYear, endMonth *int16,
	isCurrent bool,
	description string,
) error {
	companyName = strings.TrimSpace(companyName)
	if companyName == "" {
		return ErrCompanyNameRequired
	}
	if runeLen(companyName) > MaxCompanyNameLength {
		return ErrCompanyNameTooLong
	}
	title = strings.TrimSpace(title)
	if title == "" {
		return ErrTitleRequired
	}
	if runeLen(title) > MaxTitleLength {
		return ErrTitleTooLong
	}
	if runeLen(description) > MaxDescriptionLength {
		return ErrDescriptionTooLong
	}
	maxYear := int16(time.Now().Year() + 1) //nolint:gosec // G115: 西暦+1 は int16 に収まる
	if startYear < MinYear || startYear > maxYear {
		return ErrStartYearOutOfRange
	}
	if startMonth < 1 || startMonth > 12 {
		return ErrStartMonthOutOfRange
	}
	if isCurrent {
		if endYear != nil || endMonth != nil {
			return ErrCurrentHasEnd
		}
		return nil
	}
	if endYear == nil || endMonth == nil {
		return ErrEndedMissingEnd
	}
	if *endYear < MinYear || *endYear > maxYear {
		return ErrEndYearOutOfRange
	}
	if *endMonth < 1 || *endMonth > 12 {
		return ErrEndMonthOutOfRange
	}
	if *endYear < startYear || (*endYear == startYear && *endMonth < startMonth) {
		return ErrEndBeforeStart
	}
	return nil
}

func runeLen(s string) int {
	return len([]rune(s))
}
