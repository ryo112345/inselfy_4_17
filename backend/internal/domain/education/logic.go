package education

import (
	"errors"
	"strings"
	"time"
)

const (
	MaxPerUser            = 20
	MaxSchoolLength       = 200
	MaxDegreeLength       = 200
	MinYear         int16 = 1950
)

var (
	ErrSchoolRequired = errors.New("school is required")
	ErrSchoolTooLong  = errors.New("school must be 200 characters or fewer")
	ErrDegreeTooLong  = errors.New("degree must be 200 characters or fewer")
	ErrYearOutOfRange = errors.New("year must be between 1950 and next year")
	ErrEndBeforeStart = errors.New("end_year must be greater than or equal to start_year")
	ErrTooManyEntries = errors.New("educations are limited to 20 per user")
)

// ValidateCreate validates a new education entry for insertion.
func ValidateCreate(input CreateInput) error {
	return validateCore(input.School, input.Degree, input.StartYear, input.EndYear)
}

// ValidateUpdate validates an education entry update.
func ValidateUpdate(input UpdateInput) error {
	return validateCore(input.School, input.Degree, input.StartYear, input.EndYear)
}

func validateCore(school string, degree *string, startYear, endYear *int16) error {
	school = strings.TrimSpace(school)
	if school == "" {
		return ErrSchoolRequired
	}
	if runeLen(school) > MaxSchoolLength {
		return ErrSchoolTooLong
	}
	if degree != nil && runeLen(*degree) > MaxDegreeLength {
		return ErrDegreeTooLong
	}
	maxYear := int16(time.Now().Year() + 1)
	if startYear != nil && (*startYear < MinYear || *startYear > maxYear) {
		return ErrYearOutOfRange
	}
	if endYear != nil && (*endYear < MinYear || *endYear > maxYear) {
		return ErrYearOutOfRange
	}
	if startYear != nil && endYear != nil && *endYear < *startYear {
		return ErrEndBeforeStart
	}
	return nil
}

func runeLen(s string) int {
	return len([]rune(s))
}
