package usecase

import "github.com/akiyama/inselfy/backend/internal/domain/jobposting"

// jobPostingEntityConverter builds a JobPosting entity from the create input.
// Derived fields (Status, IsActive) and server-owned fields (ID, timestamps,
// company read-model fields) are ignored here; the interactor sets the derived
// ones after conversion. Run `make goverter` to regenerate.
//
// goverter:converter
// goverter:output:file ./job_posting_entity_converter.gen.go
// goverter:output:package github.com/akiyama/inselfy/backend/internal/usecase
type jobPostingEntityConverter interface {
	// goverter:ignore ID IsActive Status CompanyName CompanyLogoURL CreatedAt UpdatedAt
	CreateInputToEntity(in jobposting.CreateJobPostingInput) *jobposting.JobPosting
}
