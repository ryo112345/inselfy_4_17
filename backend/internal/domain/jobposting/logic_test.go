package jobposting

import (
	"strings"
	"testing"
)

func validPosting() *JobPosting {
	salaryMin := int32(400)
	salaryMax := int32(800)
	return &JobPosting{
		Title:          "バックエンドエンジニア",
		Description:    "Go による API 開発",
		EmploymentType: "正社員",
		Status:         "open",
		SalaryMin:      &salaryMin,
		SalaryMax:      &salaryMax,
		Tags:           []string{"Go", "PostgreSQL"},
		TeamMembers:    []TeamMember{{Name: "田中"}},
	}
}

func TestValidate_OK(t *testing.T) {
	if err := Validate(validPosting()); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	draft := validPosting()
	draft.Status = "draft"
	draft.SalaryMin = nil
	draft.SalaryMax = nil
	if err := Validate(draft); err != nil {
		t.Fatalf("expected valid draft, got %v", err)
	}
}

func TestValidate_Errors(t *testing.T) {
	int32p := func(v int32) *int32 { return &v }

	cases := []struct {
		name   string
		mutate func(j *JobPosting)
	}{
		{"empty title", func(j *JobPosting) { j.Title = "  " }},
		{"title too long", func(j *JobPosting) { j.Title = strings.Repeat("あ", MaxTitleLength+1) }},
		{"description too long", func(j *JobPosting) { j.Description = strings.Repeat("a", MaxDescriptionLength+1) }},
		{"invalid status", func(j *JobPosting) { j.Status = "published" }},
		{"empty status", func(j *JobPosting) { j.Status = "" }},
		{"negative salary min", func(j *JobPosting) { j.SalaryMin = int32p(-1) }},
		{"salary min over cap", func(j *JobPosting) { j.SalaryMin = int32p(MaxSalary + 1) }},
		{"salary max over cap", func(j *JobPosting) { j.SalaryMax = int32p(MaxSalary + 1) }},
		{"min greater than max", func(j *JobPosting) { j.SalaryMin = int32p(900); j.SalaryMax = int32p(500) }},
		{"too many tags", func(j *JobPosting) { j.Tags = make([]string, MaxTags+1) }},
		{"empty tag", func(j *JobPosting) { j.Tags = []string{""} }},
		{"tag too long", func(j *JobPosting) { j.Tags = []string{strings.Repeat("a", MaxTagLength+1)} }},
		{"too many team members", func(j *JobPosting) {
			j.TeamMembers = make([]TeamMember, MaxTeamMembers+1)
			for i := range j.TeamMembers {
				j.TeamMembers[i] = TeamMember{Name: "x"}
			}
		}},
		{"team member without name", func(j *JobPosting) { j.TeamMembers = []TeamMember{{Name: " "}} }},
		{"appeal points too long", func(j *JobPosting) { j.AppealPoints = strings.Repeat("a", MaxLongTextLength+1) }},
		{"remote policy too long", func(j *JobPosting) { j.RemotePolicy = strings.Repeat("a", MaxShortTextLength+1) }},
		{"highlight title too long", func(j *JobPosting) { j.HighlightTitleRole = strings.Repeat("a", MaxHighlightTitleLength+1) }},
		{"location too long", func(j *JobPosting) {
			loc := strings.Repeat("a", MaxLocationLength+1)
			j.Location = &loc
		}},
		{"too many gallery urls", func(j *JobPosting) { j.GalleryURLs = make([]string, MaxGalleryURLs+1) }},
		{"cover image url too long", func(j *JobPosting) { j.CoverImageURL = strings.Repeat("a", MaxURLLength+1) }},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			j := validPosting()
			tc.mutate(j)
			if err := Validate(j); err == nil {
				t.Fatalf("expected error, got nil")
			}
		})
	}
}
