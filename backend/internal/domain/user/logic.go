package user

import (
	"errors"
	"regexp"
	"strings"
)

// Length caps derived from the seed schema (`backend/scripts/seed_schema.md`).
const (
	MaxNameLength             = 100
	MaxHeadlineLength         = 255
	MaxLocationLength         = 100
	MaxAboutLength            = 2000
	MaxIndustryLength         = 100
	MaxJobTypeLength          = 50
	MaxJobSeekingStatusLength = 50
)

var profileColorRegex = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

var (
	// ErrInvalidUsername indicates the username format is invalid.
	ErrInvalidUsername = errors.New("username must be 3-20 characters of a-z, A-Z, 0-9, or _")
	// ErrNameRequired indicates the name field is empty.
	ErrNameRequired = errors.New("name is required")
	// ErrNameTooLong indicates the name exceeds MaxNameLength.
	ErrNameTooLong = errors.New("name must be 100 characters or fewer")
	// ErrHeadlineTooLong indicates the headline exceeds MaxHeadlineLength.
	ErrHeadlineTooLong = errors.New("headline must be 255 characters or fewer")
	// ErrLocationTooLong indicates the location exceeds MaxLocationLength.
	ErrLocationTooLong = errors.New("location must be 100 characters or fewer")
	// ErrAboutTooLong indicates the about exceeds MaxAboutLength.
	ErrAboutTooLong = errors.New("about must be 2000 characters or fewer")
	// ErrIndustryTooLong indicates the industry exceeds MaxIndustryLength.
	ErrIndustryTooLong = errors.New("industry must be 100 characters or fewer")
	// ErrJobTypeTooLong indicates the job_type exceeds MaxJobTypeLength.
	ErrJobTypeTooLong = errors.New("job_type must be 50 characters or fewer")
	// ErrJobSeekingStatusTooLong indicates the job_seeking_status exceeds MaxJobSeekingStatusLength.
	ErrJobSeekingStatusTooLong = errors.New("job_seeking_status must be 50 characters or fewer")
	// ErrInvalidProfileColor indicates the profile_color is not a 6-digit hex string.
	ErrInvalidProfileColor = errors.New("profile_color must be a 6-digit hex like #3D8B6E")
)

// ValidateName checks name rules.
func ValidateName(name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return ErrNameRequired
	}
	if runeLen(trimmed) > MaxNameLength {
		return ErrNameTooLong
	}
	return nil
}

// ValidateHeadline validates the optional headline.
func ValidateHeadline(s *string) error {
	if s == nil {
		return nil
	}
	if runeLen(*s) > MaxHeadlineLength {
		return ErrHeadlineTooLong
	}
	return nil
}

// ValidateLocation validates the optional location.
func ValidateLocation(s *string) error {
	if s == nil {
		return nil
	}
	if runeLen(*s) > MaxLocationLength {
		return ErrLocationTooLong
	}
	return nil
}

// ValidateAbout validates the optional about.
func ValidateAbout(s *string) error {
	if s == nil {
		return nil
	}
	if runeLen(*s) > MaxAboutLength {
		return ErrAboutTooLong
	}
	return nil
}

// ValidateIndustry validates the optional industry.
func ValidateIndustry(s *string) error {
	if s == nil {
		return nil
	}
	if runeLen(*s) > MaxIndustryLength {
		return ErrIndustryTooLong
	}
	return nil
}

// ValidateJobType validates the optional job_type.
func ValidateJobType(s *string) error {
	if s == nil {
		return nil
	}
	if runeLen(*s) > MaxJobTypeLength {
		return ErrJobTypeTooLong
	}
	return nil
}

// ValidateJobSeekingStatus validates the optional job_seeking_status.
func ValidateJobSeekingStatus(s *string) error {
	if s == nil {
		return nil
	}
	if runeLen(*s) > MaxJobSeekingStatusLength {
		return ErrJobSeekingStatusTooLong
	}
	return nil
}

// ValidateProfileColor validates the optional profile_color hex.
func ValidateProfileColor(s *string) error {
	if s == nil {
		return nil
	}
	if !profileColorRegex.MatchString(*s) {
		return ErrInvalidProfileColor
	}
	return nil
}

// Validate checks business rules for a user entity.
func Validate(u User) error {
	if err := ValidateName(u.Name); err != nil {
		return err
	}
	if u.Username == "" {
		return ErrInvalidUsername
	}
	if err := ValidateHeadline(u.Headline); err != nil {
		return err
	}
	if err := ValidateLocation(u.Location); err != nil {
		return err
	}
	if err := ValidateAbout(u.About); err != nil {
		return err
	}
	if err := ValidateIndustry(u.Industry); err != nil {
		return err
	}
	if err := ValidateJobType(u.JobType); err != nil {
		return err
	}
	if err := ValidateJobSeekingStatus(u.JobSeekingStatus); err != nil {
		return err
	}
	if err := ValidateProfileColor(u.ProfileColor); err != nil {
		return err
	}
	return nil
}

// ValidateUpdateProfile validates only fields that the caller intends to
// change (unset pointers are skipped).
func ValidateUpdateProfile(input UpdateProfileInput) error {
	if input.Name != nil {
		if err := ValidateName(*input.Name); err != nil {
			return err
		}
	}
	if input.Headline != nil {
		if err := ValidateHeadline(*input.Headline); err != nil {
			return err
		}
	}
	if input.Location != nil {
		if err := ValidateLocation(*input.Location); err != nil {
			return err
		}
	}
	if input.About != nil {
		if err := ValidateAbout(*input.About); err != nil {
			return err
		}
	}
	if input.Industry != nil {
		if err := ValidateIndustry(*input.Industry); err != nil {
			return err
		}
	}
	if input.JobType != nil {
		if err := ValidateJobType(*input.JobType); err != nil {
			return err
		}
	}
	if input.JobSeekingStatus != nil {
		if err := ValidateJobSeekingStatus(*input.JobSeekingStatus); err != nil {
			return err
		}
	}
	if input.ProfileColor != nil {
		if err := ValidateProfileColor(*input.ProfileColor); err != nil {
			return err
		}
	}
	return nil
}

func runeLen(s string) int {
	return len([]rune(s))
}
