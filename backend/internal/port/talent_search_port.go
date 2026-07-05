package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
)

// TalentSearchInputPort defines company-facing candidate search use cases.
type TalentSearchInputPort interface {
	Search(ctx context.Context, f talentsearch.Filter, limit, offset int) ([]talentsearch.Card, int, error)
	DiagnosticSearch(ctx context.Context, in talentsearch.DiagnosticSearchInput) ([]talentsearch.Card, int, error)
	CIDiagnosticSearch(ctx context.Context, in talentsearch.DiagnosticSearchInput) ([]talentsearch.Card, int, error)
	IntegratedDiagnosticSearch(ctx context.Context, in talentsearch.DiagnosticSearchInput) ([]talentsearch.Card, int, error)
}

// TalentSearchQueryService reads candidate cards and diagnostic score data.
type TalentSearchQueryService interface {
	// SearchCards lists enriched cards for public users matching f, newest first.
	SearchCards(ctx context.Context, f talentsearch.Filter, limit, offset int) ([]talentsearch.Card, int, error)
	// FilteredUserIDs lists ids of public users matching f.
	FilteredUserIDs(ctx context.Context, f talentsearch.Filter) ([]string, error)
	TeamCompanyID(ctx context.Context, teamID string) (string, error)
	// TeamAverageWVDisplayScores averages the team members' latest completed
	// work-values display scores. Errors when the team has no completed data.
	TeamAverageWVDisplayScores(ctx context.Context, teamID string) (map[string]float64, error)
	TeamAverageCIScores(ctx context.Context, teamID string) ([6]float64, error)
	// PublicUserWVScores lists the latest completed WV display scores of public
	// users ordered by user id. A nil filterUserIDs means no restriction; users
	// whose latest session has no score rows are omitted.
	PublicUserWVScores(ctx context.Context, filterUserIDs []string) ([]talentsearch.UserWVScores, error)
	PublicUserCIScores(ctx context.Context, filterUserIDs []string) ([]talentsearch.UserCIScores, error)
	// CardsByUserIDs returns enriched cards in the given order, silently
	// dropping unknown or non-public ids.
	CardsByUserIDs(ctx context.Context, userIDs []string) ([]talentsearch.Card, error)
	// WVScoresByUserIDs maps each given user to their latest completed WV
	// display scores; users without completed scored sessions are absent.
	WVScoresByUserIDs(ctx context.Context, userIDs []string) (map[string]map[string]float64, error)
	CIScoresByUserIDs(ctx context.Context, userIDs []string) (map[string][6]float64, error)
}
