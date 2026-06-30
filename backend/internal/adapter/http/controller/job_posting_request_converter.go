package controller

import "github.com/akiyama/inselfy/backend/internal/domain/jobposting"

// jobPostingRequestConverter maps the HTTP request body to the domain input
// structs. CompanyID is sourced from the authenticated context, not the body,
// so it is ignored here and set by the controller. Run `make goverter` to
// regenerate.
//
// goverter:converter
// goverter:output:file ./job_posting_request_converter.gen.go
// goverter:output:package github.com/akiyama/inselfy/backend/internal/adapter/http/controller
type jobPostingRequestConverter interface {
	// goverter:ignore CompanyID
	ToCreateInput(r jobPostingRequest) jobposting.CreateJobPostingInput
	ToUpdateInput(r jobPostingRequest) jobposting.UpdateJobPostingInput
}
