// Package education holds the education domain model.
package education

import "time"

// Education is an aggregate root for one education entry.
type Education struct {
	ID        string
	UserID    string
	School    string
	Degree    *string
	StartYear *int16
	EndYear   *int16
	CreatedAt time.Time
	UpdatedAt time.Time
}

// CreateInput collects the fields required to create a new education entry.
type CreateInput struct {
	UserID    string
	School    string
	Degree    *string
	StartYear *int16
	EndYear   *int16
}

// UpdateInput collects the fields required to update an existing education entry.
type UpdateInput struct {
	ID        string
	School    string
	Degree    *string
	StartYear *int16
	EndYear   *int16
}
