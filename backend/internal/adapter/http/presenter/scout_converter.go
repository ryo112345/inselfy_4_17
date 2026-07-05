package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
)

// scoutConverter declares the scout read-model→response mappings.
// Run `make goverter` to regenerate.
//
// goverter:converter
// goverter:output:file ./scout_converter.gen.go
// goverter:output:package github.com/akiyama/inselfy/backend/internal/adapter/http/presenter
// goverter:extend copyTime scoutStatusToString
// goverter:matchIgnoreCase
// goverter:useZeroValueOnPointerInconsistency
type scoutConverter interface {
	// goverter:autoMap ScoutMessage
	ToScoutMessageResponse(m *scout.ScoutMessageWithNames) *openapi.ModelsScoutMessageResponse
	ToScoutReplyResponses(rs []*scout.ScoutReply) []openapi.ModelsScoutReplyResponse
}

func scoutStatusToString(s scout.Status) string { return string(s) }
