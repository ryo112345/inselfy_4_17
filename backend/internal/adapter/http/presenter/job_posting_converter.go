package presenter

import (
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
)

// jobPostingConverter declares the entity→response mapping. goverter generates
// the implementation into job_posting_converter.gen.go (same package, so it can
// access the unexported response types). Run `make goverter` to regenerate.
//
// goverter:converter
// goverter:output:file ./job_posting_converter.gen.go
// goverter:output:package github.com/akiyama/inselfy/backend/internal/adapter/http/presenter
// goverter:extend emptySliceIfNil
// goverter:extend copyTime
type jobPostingConverter interface {
	ToResponse(j *jobposting.JobPosting) *jobPostingResponse
	ToResponses(js []*jobposting.JobPosting) []*jobPostingResponse
}

// emptySliceIfNil normalizes nil slices to empty slices so JSON renders [] not null.
// goverter calls this for every []string field via the extend directive.
func emptySliceIfNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// copyTime assigns time.Time directly instead of letting goverter descend into
// its unexported fields.
func copyTime(t time.Time) time.Time { return t }
