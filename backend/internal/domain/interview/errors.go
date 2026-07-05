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
	ErrTooManySlots       = errors.New("maximum 10 slots")
	ErrInvalidTimeRange   = errors.New("end time must be after start time")

	ErrApplicationNotFound   = errors.New("application not found")
	ErrNotProposalOwner      = errors.New("not your proposal")
	ErrSlotNotInProposal     = errors.New("slot does not belong to this proposal")
	ErrTimeOutsideSlot       = errors.New("selected time must be within the slot range")
	ErrInterviewNotScheduled = errors.New("interview is not scheduled")
	ErrCancelUnauthorized    = errors.New("unauthorized")
)
