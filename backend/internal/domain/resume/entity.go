// Package resume holds the resume-upload domain model: a candidate-uploaded
// PDF that an admin turns into a profile draft and approves into the profile.
package resume

import (
	"errors"
	"time"
)

// Status is the lifecycle state of a resume upload.
// pending → (draft saved) → reviewing → (approve) → approved.
// pending/reviewing → (reject) → rejected. approved/rejected are terminal.
type Status string

const (
	StatusPending   Status = "pending"
	StatusReviewing Status = "reviewing"
	StatusApproved  Status = "approved"
	StatusRejected  Status = "rejected"
)

var (
	// ErrNotEditable indicates the upload is in a terminal status and its
	// draft can no longer be modified.
	ErrNotEditable = errors.New("resume is not editable")
	// ErrNotReviewing indicates approval was attempted before a valid draft
	// was saved (or after the upload already reached a terminal status).
	ErrNotReviewing = errors.New("resume is not in reviewing status")
)

// Upload is an aggregate root for one uploaded resume PDF.
type Upload struct {
	ID               string
	UserID           string
	OriginalFilename string
	StorageKey       string
	Status           Status
	Draft            []byte
	ApprovedBy       *string
	CreatedAt        time.Time
	UpdatedAt        time.Time

	// Denormalized user fields for admin listings (populated by JOIN reads).
	UserName string
	Username string
}
