package presenter

import "github.com/akiyama/inselfy/backend/internal/domain/jobapplication"

// jobApplicationConverter declares the read-model→response mapping. goverter
// generates the implementation into job_application_converter.gen.go.
// Run `make goverter` to regenerate.
//
// goverter:converter
// goverter:output:file ./job_application_converter.gen.go
// goverter:output:package github.com/akiyama/inselfy/backend/internal/adapter/http/presenter
// goverter:extend copyTime
type jobApplicationConverter interface {
	// goverter:autoMap JobApplication
	ToResponse(a *jobapplication.JobApplicationWithDetails) *JobApplicationResponse
	ToResponses(as []*jobapplication.JobApplicationWithDetails) []*JobApplicationResponse
}
