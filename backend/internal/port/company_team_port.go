package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/company"
)

// CompanyTeamInputPort defines the company team management use cases.
type CompanyTeamInputPort interface {
	ListTeams(ctx context.Context, companyID string) ([]company.TeamSummary, error)
	CreateTeam(ctx context.Context, companyID, name string, description *string) (*company.Team, error)
	GetTeam(ctx context.Context, companyID, teamID string) (*company.TeamWithMembers, error)
	UpdateTeam(ctx context.Context, companyID, teamID, name string, description *string, isPublic *bool) error
	DeleteTeam(ctx context.Context, companyID, teamID string) error
	AddMember(ctx context.Context, companyID, teamID, name string, email *string) (*company.TeamMember, error)
	RemoveMember(ctx context.Context, companyID, teamID, memberID string) error
	GetTeamScores(ctx context.Context, companyID, teamID string) ([]company.TeamMemberScores, error)
	SetAceMember(ctx context.Context, companyID, teamID, memberID string) error
	UnsetAceMember(ctx context.Context, companyID, teamID string) error
	GetPublicTeamScores(ctx context.Context, companyID string) ([]company.TeamPublicScores, error)
}

// CompanyTeamRepository persists teams and their members.
type CompanyTeamRepository interface {
	CreateTeam(ctx context.Context, companyID, name string, description *string) (*company.Team, error)
	GetTeam(ctx context.Context, teamID, companyID string) (*company.Team, error)
	UpdateTeam(ctx context.Context, teamID, companyID, name string, description *string, isPublic *bool) error
	DeleteTeam(ctx context.Context, teamID, companyID string) error
	GetTeamOwner(ctx context.Context, teamID string) (string, error)
	ListMembers(ctx context.Context, teamID string) ([]company.TeamMember, error)
	CountMembers(ctx context.Context, teamID string) (int, error)
	CreateMemberUser(ctx context.Context, username, name string) (string, error)
	AddMember(ctx context.Context, teamID, userID, name string, email *string, inviteToken string) (*company.TeamMember, error)
	GetMemberUserID(ctx context.Context, teamID, memberID string) (string, error)
	DeleteMember(ctx context.Context, teamID, memberID string) error
	DeleteMemberUser(ctx context.Context, userID string) error
	UnsetAce(ctx context.Context, teamID string) error
	SetAce(ctx context.Context, teamID, memberID string) error
}

// CompanyTeamQueryService reads team composite views and diagnosis scores.
type CompanyTeamQueryService interface {
	ListTeamSummaries(ctx context.Context, companyID string) ([]company.TeamSummary, error)
	ListPublicTeams(ctx context.Context, companyID string) ([]company.PublicTeamInfo, error)
	ListMemberStates(ctx context.Context, teamID string) ([]company.TeamMemberState, error)
	// ListUserWVScores returns Work Values scores across the user's completed
	// sessions, newest session first (rows may contain duplicate value ids).
	ListUserWVScores(ctx context.Context, userID string) ([]company.ScoreRow, error)
	// ListUserCIScores is the Career Interest counterpart of ListUserWVScores.
	ListUserCIScores(ctx context.Context, userID string) ([]company.ScoreRow, error)
	// GetLatestWNMu returns the latest completed session's work-needs mu map,
	// or nil when the user has none.
	GetLatestWNMu(ctx context.Context, userID string) (map[string]float64, error)
}
