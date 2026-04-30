package jobposting

import "time"

type TeamMember struct {
	Name     string `json:"name"`
	PhotoURL string `json:"photoUrl,omitempty"`
}

type JobPosting struct {
	ID                        string
	CompanyID                 string
	CompanyName               string
	CompanyLogoURL            string
	Title                     string
	Description               string
	EmploymentType            string
	Location                  *string
	IsActive                  bool
	Status                    string
	JobCategory               string
	HiringCount               string
	AppealPoints              string
	Challenges                string
	TeamDescription           string
	TeamMembers               []TeamMember
	TeamLabel                 string
	TeamID                    *string
	SkillsGained              string
	Tags                      []string
	RequiredQualifications    string
	PreferredQualifications   string
	WorkLocation              string
	WorkLocationChangeScope   string
	JobDescriptionChangeScope string
	ContractType              string
	ProbationPeriod           string
	WorkHours                 string
	BreakTime                 string
	Holidays                  string
	SalaryMin                 *int32
	SalaryMax                 *int32
	SalaryDetail              string
	Insurance                 string
	RemotePolicy              string
	Benefits                  string
	SmokingPolicy             string
	SelectionProcess          string
	CoverImageURL             string
	HighlightTitleRole        string
	HighlightTitleAppeal      string
	HighlightTitleChallenge   string
	HighlightTitleGrowth      string
	GalleryURLs               []string
	CreatedAt                 time.Time
	UpdatedAt                 time.Time
}

type CreateJobPostingInput struct {
	CompanyID                 string
	Title                     string
	Description               string
	EmploymentType            string
	Location                  *string
	Status                    string
	JobCategory               string
	HiringCount               string
	AppealPoints              string
	Challenges                string
	TeamDescription           string
	TeamMembers               []TeamMember
	TeamLabel                 string
	TeamID                    *string
	SkillsGained              string
	Tags                      []string
	RequiredQualifications    string
	PreferredQualifications   string
	WorkLocation              string
	WorkLocationChangeScope   string
	JobDescriptionChangeScope string
	ContractType              string
	ProbationPeriod           string
	WorkHours                 string
	BreakTime                 string
	Holidays                  string
	SalaryMin                 *int32
	SalaryMax                 *int32
	SalaryDetail              string
	Insurance                 string
	RemotePolicy              string
	Benefits                  string
	SmokingPolicy             string
	SelectionProcess          string
	CoverImageURL             string
	HighlightTitleRole        string
	HighlightTitleAppeal      string
	HighlightTitleChallenge   string
	HighlightTitleGrowth      string
	GalleryURLs               []string
}

type UpdateJobPostingInput struct {
	Title                     string
	Description               string
	EmploymentType            string
	Location                  *string
	Status                    string
	JobCategory               string
	HiringCount               string
	AppealPoints              string
	Challenges                string
	TeamDescription           string
	TeamMembers               []TeamMember
	TeamLabel                 string
	TeamID                    *string
	SkillsGained              string
	Tags                      []string
	RequiredQualifications    string
	PreferredQualifications   string
	WorkLocation              string
	WorkLocationChangeScope   string
	JobDescriptionChangeScope string
	ContractType              string
	ProbationPeriod           string
	WorkHours                 string
	BreakTime                 string
	Holidays                  string
	SalaryMin                 *int32
	SalaryMax                 *int32
	SalaryDetail              string
	Insurance                 string
	RemotePolicy              string
	Benefits                  string
	SmokingPolicy             string
	SelectionProcess          string
	CoverImageURL             string
	HighlightTitleRole        string
	HighlightTitleAppeal      string
	HighlightTitleChallenge   string
	HighlightTitleGrowth      string
	GalleryURLs               []string
}
