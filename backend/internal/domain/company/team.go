package company

import "time"

// TeamDiagnoseInfo is a read model for the public team-diagnose page,
// joining a team member with its team and company names.
type TeamDiagnoseInfo struct {
	MemberID    string
	UserID      string
	MemberName  string
	Email       *string
	WVStatus    string
	CIStatus    string
	TeamName    string
	CompanyName string
}

// Team is a company-owned team of members undergoing diagnosis.
type Team struct {
	ID          string
	CompanyID   string
	Name        string
	Description *string
	IsPublic    bool
	CreatedAt   time.Time
}

// TeamSummary is a read model for the team list, a team plus member/diagnosis counts.
type TeamSummary struct {
	Team
	MemberCount int
	WVCompleted int
	CICompleted int
}

// TeamMember is a member row of a team.
type TeamMember struct {
	ID          string
	Name        string
	Email       *string
	InviteToken string
	WVStatus    string
	CIStatus    string
	IsAce       bool
	CreatedAt   time.Time
}

// TeamWithMembers is a read model for the team detail view.
type TeamWithMembers struct {
	Team
	Members []TeamMember
}

// TeamMemberState is a read model of a member's diagnosis progress.
type TeamMemberState struct {
	MemberID string
	UserID   string
	Name     string
	WVStatus string
	CIStatus string
	IsAce    bool
}

// ScoreRow is one diagnosis score (Work Values value or Career Interest type).
type ScoreRow struct {
	ID           string
	DisplayScore float64
	Rank         int
}

// TeamMemberScores is a read model of one member's latest diagnosis scores.
type TeamMemberScores struct {
	TeamMemberState
	WVScores []ScoreRow
	CIScores []ScoreRow
}

// PublicTeamInfo is a public team with its member count.
type PublicTeamInfo struct {
	ID          string
	Name        string
	MemberCount int
}

// PublicScoreEntry is one aggregated team score exposed on the public page.
type PublicScoreEntry struct {
	ID    string
	Score float64
}

// TeamPublicScores is a read model of a public team's aggregated scores.
// Score slices are nil when too few members completed the diagnosis.
type TeamPublicScores struct {
	TeamID         string
	TeamName       string
	WVScores       []PublicScoreEntry
	WNScores       []PublicScoreEntry
	CIScores       []PublicScoreEntry
	MemberCount    int
	CompletedCount int
}
