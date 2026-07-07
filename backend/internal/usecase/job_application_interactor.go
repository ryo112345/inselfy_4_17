package usecase

import (
	"context"
	"errors"
	"math"
	"strings"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobApplicationInteractor struct {
	repo    port.JobApplicationRepository
	jobRepo port.JobPostingRepository
	query   port.JobApplicationQueryService
}

var _ port.JobApplicationInputPort = (*JobApplicationInteractor)(nil)

func NewJobApplicationInteractor(
	repo port.JobApplicationRepository,
	jobRepo port.JobPostingRepository,
	query port.JobApplicationQueryService,
) *JobApplicationInteractor {
	return &JobApplicationInteractor{repo: repo, jobRepo: jobRepo, query: query}
}

func (i *JobApplicationInteractor) Apply(ctx context.Context, input jobapplication.ApplyInput) (*jobapplication.JobApplicationWithDetails, error) {
	jp, err := i.jobRepo.GetPublicByID(ctx, input.JobPostingID)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return nil, jobapplication.ErrJobNotOpen
		}
		return nil, err
	}
	if jp.Status != "open" {
		return nil, jobapplication.ErrJobNotOpen
	}
	if len([]rune(input.Message)) > jobapplication.MaxMessageLength {
		return nil, domainerr.NewValidation("message は %d 文字以下にしてください", jobapplication.MaxMessageLength)
	}

	a := &jobapplication.JobApplication{
		JobPostingID: input.JobPostingID,
		CandidateID:  input.CandidateID,
		CompanyID:    jp.CompanyID,
		Status:       jobapplication.StatusApplied,
		Message:      strings.TrimSpace(input.Message),
	}
	created, err := i.repo.Create(ctx, a)
	if err != nil {
		return nil, err
	}

	detail, err := i.repo.GetByID(ctx, created.ID)
	if err != nil {
		return nil, err
	}
	return detail, nil
}

func (i *JobApplicationInteractor) ListByCompany(ctx context.Context, companyID string, filter jobapplication.ListFilter) ([]*jobapplication.JobApplicationWithDetails, int, error) {
	apps, total, err := i.repo.ListByCompanyID(ctx, companyID, filter)
	if err != nil {
		return nil, 0, err
	}
	i.enrichWithSimilarity(ctx, companyID, apps)
	return apps, total, nil
}

// enrichWithSimilarity fills each application's WV/CI/integrated similarity
// between the candidate and the applied job's team. Teams owned by other
// companies are skipped; missing diagnostics and read errors degrade silently
// so the list stays usable without similarity.
func (i *JobApplicationInteractor) enrichWithSimilarity(ctx context.Context, companyID string, apps []*jobapplication.JobApplicationWithDetails) {
	if len(apps) == 0 {
		return
	}

	jpIDSet := map[string]bool{}
	candidateIDSet := map[string]bool{}
	for _, a := range apps {
		jpIDSet[a.JobPostingID] = true
		candidateIDSet[a.CandidateID] = true
	}

	jpTeams, err := i.query.JobPostingTeamIDs(ctx, keys(jpIDSet))
	if err != nil || len(jpTeams) == 0 {
		return
	}

	uniqueTeams := map[string]bool{}
	for _, tid := range jpTeams {
		uniqueTeams[tid] = true
	}

	teamWV := map[string]map[string]float64{}
	teamCI := map[string][6]float64{}
	for tid := range uniqueTeams {
		owner, err := i.query.TeamCompanyID(ctx, tid)
		if err != nil || owner != companyID {
			continue
		}
		if scores, err := i.query.TeamAverageWVDisplayScores(ctx, tid); err == nil {
			teamWV[tid] = scores
		}
		if scores, err := i.query.TeamAverageCIScores(ctx, tid); err == nil {
			teamCI[tid] = scores
		}
	}
	if len(teamWV) == 0 && len(teamCI) == 0 {
		return
	}

	candidateIDs := keys(candidateIDSet)
	candidateWV, err := i.query.WVScoresByUserIDs(ctx, candidateIDs)
	if err != nil {
		candidateWV = nil
	}
	candidateCI, err := i.query.CIScoresByUserIDs(ctx, candidateIDs)
	if err != nil {
		candidateCI = nil
	}

	for _, a := range apps {
		teamID, ok := jpTeams[a.JobPostingID]
		if !ok {
			continue
		}
		if twv, ok := teamWV[teamID]; ok {
			if cwv, ok := candidateWV[a.CandidateID]; ok {
				sim := talentsearch.GaussianWVSimilarity(cwv, twv)
				a.WVSimilarity = &sim
			}
		}
		if tci, ok := teamCI[teamID]; ok {
			if cci, ok := candidateCI[a.CandidateID]; ok {
				sim := talentsearch.GaussianCISimilarity(cci, tci)
				a.CISimilarity = &sim
			}
		}
		if a.WVSimilarity != nil && a.CISimilarity != nil {
			avg := math.Round((*a.WVSimilarity+*a.CISimilarity)/2.0*10) / 10
			a.IntSimilarity = &avg
		}
	}
}

func keys(set map[string]bool) []string {
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	return out
}

func (i *JobApplicationInteractor) ListByCandidate(ctx context.Context, candidateID string) ([]*jobapplication.JobApplicationWithDetails, int, error) {
	apps, err := i.repo.ListByCandidateID(ctx, candidateID)
	if err != nil {
		return nil, 0, err
	}
	return apps, len(apps), nil
}

func (i *JobApplicationInteractor) GetByID(ctx context.Context, companyID, applicationID string) (*jobapplication.JobApplicationWithDetails, error) {
	app, err := i.repo.GetByID(ctx, applicationID)
	if err != nil {
		return nil, err
	}
	if app.CompanyID != companyID {
		return nil, domainerr.ErrNotFound
	}
	return app, nil
}

func (i *JobApplicationInteractor) UpdateStatus(ctx context.Context, companyID, applicationID string, status jobapplication.Status) error {
	if err := jobapplication.ValidateStatus(status); err != nil {
		return err
	}
	app, err := i.repo.GetByID(ctx, applicationID)
	if err != nil {
		return err
	}
	if app.CompanyID != companyID {
		return domainerr.ErrNotFound
	}
	if err := i.repo.UpdateStatus(ctx, applicationID, status); err != nil {
		return err
	}
	return nil
}

func (i *JobApplicationInteractor) Withdraw(ctx context.Context, candidateID, applicationID string) error {
	app, err := i.repo.GetByID(ctx, applicationID)
	if err != nil {
		return err
	}
	if app.CandidateID != candidateID {
		return domainerr.ErrNotFound
	}
	if err := i.repo.UpdateStatus(ctx, applicationID, jobapplication.StatusWithdrawn); err != nil {
		return err
	}
	return nil
}

func (i *JobApplicationInteractor) CheckApplied(ctx context.Context, candidateID, jobPostingID string) (bool, error) {
	_, err := i.repo.GetByCandidateAndJob(ctx, candidateID, jobPostingID)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
