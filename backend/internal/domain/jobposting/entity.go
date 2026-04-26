package jobposting

import "time"

type JobPosting struct {
	ID             string
	CompanyID      string
	Title          string
	Description    string
	EmploymentType string
	Location       *string
	IsActive       bool
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type CreateJobPostingInput struct {
	CompanyID      string
	Title          string
	Description    string
	EmploymentType string
	Location       *string
}

type UpdateJobPostingInput struct {
	Title          string
	Description    string
	EmploymentType string
	Location       *string
	IsActive       *bool
}
