package jobapplication

import (
	"errors"
	"time"
)

type Status string

const (
	StatusApplied   Status = "applied"
	StatusScreening Status = "screening"
	StatusInterview Status = "interview"
	StatusOffer     Status = "offer"
	StatusAccepted  Status = "accepted"
	StatusRejected  Status = "rejected"
	StatusWithdrawn Status = "withdrawn"
)

var validStatuses = map[Status]bool{
	StatusApplied:   true,
	StatusScreening: true,
	StatusInterview: true,
	StatusOffer:     true,
	StatusAccepted:  true,
	StatusRejected:  true,
	StatusWithdrawn: true,
}

var (
	ErrAlreadyApplied = errors.New("already applied to this job")
	ErrInvalidStatus  = errors.New("invalid application status")
	ErrJobNotOpen     = errors.New("job posting is not open for applications")
)

func ValidateStatus(s Status) error {
	if !validStatuses[s] {
		return ErrInvalidStatus
	}
	return nil
}

type JobApplication struct {
	ID           string
	JobPostingID string
	CandidateID  string
	CompanyID    string
	Status       Status
	Message      string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type JobApplicationWithDetails struct {
	JobApplication
	JobTitle           string
	CompanyName        string
	CandidateName      string
	CandidateAvatar    string
	CandidateUsername  string
	CandidateHeadline string
}

type ApplyInput struct {
	JobPostingID string
	CandidateID  string
	Message      string
}
