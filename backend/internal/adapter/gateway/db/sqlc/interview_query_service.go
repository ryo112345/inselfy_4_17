package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/interview"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type InterviewQueryService struct {
	pool *pgxpool.Pool
}

var _ port.InterviewQueryService = (*InterviewQueryService)(nil)

func NewInterviewQueryService(pool *pgxpool.Pool) *InterviewQueryService {
	return &InterviewQueryService{pool: pool}
}

func (s *InterviewQueryService) ApplicationCandidateID(ctx context.Context, applicationID, companyID string) (string, error) {
	var candidateID string
	err := s.pool.QueryRow(ctx,
		"SELECT candidate_id FROM job_applications WHERE id = $1 AND company_id = $2", applicationID, companyID).
		Scan(&candidateID)
	if err != nil {
		return "", err
	}
	return candidateID, nil
}

func (s *InterviewQueryService) MarkApplicationInterviewing(ctx context.Context, applicationID string) error {
	_, err := s.pool.Exec(ctx,
		"UPDATE job_applications SET status = 'interview', updated_at = NOW() WHERE id = $1 AND status IN ('applied', 'screening')",
		applicationID)
	return err
}

func (s *InterviewQueryService) CandidateNameAndAvatar(ctx context.Context, userID string) (string, string, error) {
	var name, avatarURL string
	err := s.pool.QueryRow(ctx,
		"SELECT name, COALESCE(avatar_url, '') FROM users WHERE id = $1", userID).
		Scan(&name, &avatarURL)
	return name, avatarURL, err
}

func (s *InterviewQueryService) CompanyName(ctx context.Context, companyID string) (string, error) {
	var companyName string
	err := s.pool.QueryRow(ctx,
		"SELECT company_name FROM company_accounts WHERE id = $1", companyID).
		Scan(&companyName)
	return companyName, err
}

func (s *InterviewQueryService) JobTitleByApplication(ctx context.Context, applicationID string) (string, error) {
	var jobTitle string
	err := s.pool.QueryRow(ctx,
		"SELECT jp.title FROM job_applications ja JOIN job_postings jp ON jp.id = ja.job_posting_id WHERE ja.id = $1", applicationID).
		Scan(&jobTitle)
	return jobTitle, err
}

func (s *InterviewQueryService) PendingProposalByApplication(ctx context.Context, applicationID string) (*interview.PendingProposal, error) {
	p := &interview.PendingProposal{}
	var status string
	err := s.pool.QueryRow(ctx,
		"SELECT id, status, created_at FROM interview_proposals WHERE application_id = $1 AND status = 'pending' AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
		applicationID).Scan(&p.ProposalID, &status, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}
