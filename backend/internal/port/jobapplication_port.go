package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
)

type JobApplicationInputPort interface {
	Apply(ctx context.Context, input jobapplication.ApplyInput) (*jobapplication.JobApplicationWithDetails, error)
	ListByCompany(ctx context.Context, companyID string, filter jobapplication.ListFilter) ([]*jobapplication.JobApplicationWithDetails, int, error)
	ListByCandidate(ctx context.Context, candidateID string) ([]*jobapplication.JobApplicationWithDetails, int, error)
	GetByID(ctx context.Context, companyID, applicationID string) (*jobapplication.JobApplicationWithDetails, error)
	UpdateStatus(ctx context.Context, companyID, applicationID string, status jobapplication.Status) error
	Withdraw(ctx context.Context, candidateID, applicationID string) error
	CheckApplied(ctx context.Context, candidateID, jobPostingID string) (bool, error)
}

// JobApplicationQueryService reads the diagnostic score data used to enrich
// company-facing application lists with candidate↔team similarity.
type JobApplicationQueryService interface {
	// JobPostingTeamIDs maps each given job posting id to its team id,
	// omitting postings without a team.
	JobPostingTeamIDs(ctx context.Context, jobPostingIDs []string) (map[string]string, error)
	TeamCompanyID(ctx context.Context, teamID string) (string, error)
	// TeamAverageWVDisplayScores averages the team members' latest completed
	// work-values display scores. Errors when the team has no completed data.
	TeamAverageWVDisplayScores(ctx context.Context, teamID string) (map[string]float64, error)
	TeamAverageCIScores(ctx context.Context, teamID string) ([6]float64, error)
	// WVScoresByUserIDs maps each given user to their latest completed WV
	// display scores; users without completed scored sessions are absent.
	WVScoresByUserIDs(ctx context.Context, userIDs []string) (map[string]map[string]float64, error)
	CIScoresByUserIDs(ctx context.Context, userIDs []string) (map[string][6]float64, error)
}

type JobApplicationRepository interface {
	Create(ctx context.Context, a *jobapplication.JobApplication) (*jobapplication.JobApplication, error)
	GetByID(ctx context.Context, id string) (*jobapplication.JobApplicationWithDetails, error)
	GetByCandidateAndJob(ctx context.Context, candidateID, jobPostingID string) (*jobapplication.JobApplication, error)
	ListByCompanyID(ctx context.Context, companyID string, filter jobapplication.ListFilter) ([]*jobapplication.JobApplicationWithDetails, int, error)
	ListByCandidateID(ctx context.Context, candidateID string) ([]*jobapplication.JobApplicationWithDetails, error)
	UpdateStatus(ctx context.Context, id string, status jobapplication.Status) error
}
