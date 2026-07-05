package interview

import "errors"

var (
	ErrProposalNotFound   = errors.New("proposal not found")
	ErrSlotNotFound       = errors.New("slot not found")
	ErrInterviewNotFound  = errors.New("interview not found")
	ErrProposalExpired    = errors.New("proposal has expired")
	ErrProposalNotPending = errors.New("proposal is not pending")
	ErrSlotNotProposed    = errors.New("slot is not in proposed status")
	ErrNotCandidate       = errors.New("only the candidate can select a slot")
	ErrNoSlots            = errors.New("at least one slot is required")
	ErrTooManySlots       = errors.New("maximum 10 slots per proposal")
	ErrInvalidTimeRange   = errors.New("end time must be after start time")
)
