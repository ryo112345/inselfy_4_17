package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
)

// jobApplicationConverter declares the read-model→response mapping. goverter
// generates the implementation into job_application_converter.gen.go.
// Run `make goverter` to regenerate.
//
// goverter:converter
// goverter:output:file ./job_application_converter.gen.go
// goverter:output:package github.com/akiyama/inselfy/backend/internal/adapter/http/presenter
// goverter:extend copyTime omitEmptyString omitEmptyStringSlice jobApplicationStatusToModel
// goverter:matchIgnoreCase
type jobApplicationConverter interface {
	// goverter:autoMap JobApplication
	// goverter:map IntSimilarity IntegratedSimilarity
	ToResponse(a *jobapplication.JobApplicationWithDetails) *openapi.ModelsJobApplicationResponse
	ToResponses(as []*jobapplication.JobApplicationWithDetails) []*openapi.ModelsJobApplicationResponse
}

func jobApplicationStatusToModel(s jobapplication.Status) openapi.ModelsJobApplicationStatus {
	return openapi.ModelsJobApplicationStatus(s)
}

// omitEmptyString preserves the old `json:",omitempty"` behavior on string
// fields that became optional (*string) in the generated response models.
func omitEmptyString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// omitEmptyStringSlice preserves the old `json:",omitempty"` behavior on
// slice fields that became optional (*[]string) in the generated models.
func omitEmptyStringSlice(s []string) *[]string {
	if len(s) == 0 {
		return nil
	}
	return &s
}
