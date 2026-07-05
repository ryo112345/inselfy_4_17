package company

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
