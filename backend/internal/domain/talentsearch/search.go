package talentsearch

import "errors"

// DiagnosticSearchInput carries a diagnostic talent search request. The
// target profile comes from either TeamID (team averages, ownership-checked
// against CompanyID) or the custom weights parsed from query params.
type DiagnosticSearchInput struct {
	CompanyID string
	TeamID    string
	Filter    Filter
	CustomWV  map[string]float64 // nil when no wv_* params were given
	CustomCI  *[6]float64        // nil when no ci_* params were given
	Limit     int
	Offset    int
}

// UserWVScores is a public user's latest completed work-values display scores.
type UserWVScores struct {
	UserID string
	Scores map[string]float64
}

// UserCIScores is a public user's latest completed RIASEC score vector.
type UserCIScores struct {
	UserID string
	Scores [6]float64
}

// Sentinel errors keep the exact 400 messages the legacy handlers returned.
var (
	ErrTeamWVUnavailable   = errors.New("team not found or no completed WV data")
	ErrTeamCIUnavailable   = errors.New("team not found or no completed CI data")
	ErrTeamDiagUnavailable = errors.New("team not found or no completed diagnostic data")
	ErrTeamWVMissing       = errors.New("team has no completed WV data")
	ErrTeamCIMissing       = errors.New("team has no completed CI data")
	ErrWVWeightsRequired   = errors.New("team_id or custom wv_ weights required")
	ErrCIWeightsRequired   = errors.New("team_id or custom ci_ weights required")
	ErrBothWeightsRequired = errors.New("both wv_ and ci_ weights required")
)
