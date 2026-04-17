// Package experience holds the experience domain model (a user's work history entry).
package experience

import "time"

// Experience is an aggregate root representing one work-history entry.
// When IsCurrent is true, EndYear and EndMonth MUST be nil.
// When IsCurrent is false, both EndYear and EndMonth MUST be non-nil.
type Experience struct {
	ID          string
	UserID      string
	CompanyName string
	Title       string
	StartYear   int16
	StartMonth  int16
	EndYear     *int16
	EndMonth    *int16
	IsCurrent   bool
	Description string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// CreateInput collects the fields required to create a new experience.
type CreateInput struct {
	UserID      string
	CompanyName string
	Title       string
	StartYear   int16
	StartMonth  int16
	EndYear     *int16
	EndMonth    *int16
	IsCurrent   bool
	Description string
}

// UpdateInput collects the fields required to update an existing experience.
// Experience updates are full replacements (PUT semantics) to keep the
// invariant across `is_current` and end dates enforceable atomically.
type UpdateInput struct {
	ID          string
	CompanyName string
	Title       string
	StartYear   int16
	StartMonth  int16
	EndYear     *int16
	EndMonth    *int16
	IsCurrent   bool
	Description string
}
