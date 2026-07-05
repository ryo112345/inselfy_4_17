package interview

import "time"

type Proposal struct {
	ID              string
	ApplicationID   string
	CompanyID       string
	CandidateID     string
	Message         string
	Status          string // pending, confirmed, expired, cancelled
	MessageID       string
	DurationMinutes int
	ExpiresAt       time.Time
	Slots           []Slot
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Slot struct {
	ID            string
	ProposalID    string
	ApplicationID string
	ProposedBy    string
	StartTime     time.Time
	EndTime       time.Time
	Status        string // proposed, selected, rejected
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type Interview struct {
	ID             string
	ApplicationID  string
	CompanyID      string
	CandidateID    string
	Title          string
	StartTime      time.Time
	EndTime        time.Time
	Location       string
	MeetingURL     string
	InternalNotes  string
	Status         string // scheduled, completed, cancelled, no_show
	SelectedSlotID string
	ProposalID     string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type InterviewWithNames struct {
	Interview
	CandidateName   string
	CandidateAvatar string
	JobTitle        string
	CompanyName     string
}

type ProposeInput struct {
	ApplicationID   string
	CompanyID       string
	Message         string
	Location        string
	DurationMinutes int
	Slots           []SlotInput
	ExpiresInDays   int
}

type SlotInput struct {
	StartTime time.Time
	EndTime   time.Time
}

type SelectSlotInput struct {
	ProposalID  string
	SlotID      string
	CandidateID string
	// StartTime/EndTime narrow the interview time within the selected slot.
	// Both must be set to take effect; otherwise the slot's full range is used.
	StartTime *time.Time
	EndTime   *time.Time
}

type ProposeOutput struct {
	Proposal             *Proposal
	Slots                []*Slot
	CancelledProposalIDs []string
}

// ProposalWithDetails is the read model for a candidate's pending proposal
// list, enriched with company/job names for display.
type ProposalWithDetails struct {
	ID              string
	CompanyName     string
	JobTitle        string
	Message         string
	DurationMinutes int
	Slots           []*Slot
	ExpiresAt       time.Time
	CreatedAt       time.Time
}

type PendingProposal struct {
	ProposalID string
	CreatedAt  time.Time
}
