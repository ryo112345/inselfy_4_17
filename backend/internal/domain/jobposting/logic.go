package jobposting

import (
	"strings"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
)

// Field limits. Keep in sync with api-schema/typespec/models/job-posting.tsp.
const (
	MaxTitleLength          = 200
	MaxDescriptionLength    = 30000
	MaxEmploymentTypeLength = 50
	MaxLocationLength       = 255
	MaxJobCategoryLength    = 100
	MaxHiringCountLength    = 100
	MaxLongTextLength       = 10000 // appealPoints, challenges, teamDescription, skillsGained, qualifications, salaryDetail, benefits, selectionProcess
	MaxMediumTextLength     = 1000  // workLocation, holidays, insurance
	MaxShortTextLength      = 255   // changeScope, contractType, probationPeriod, workHours, breakTime, remotePolicy, smokingPolicy, teamLabel
	MaxHighlightTitleLength = 50
	MaxTags                 = 20
	MaxTagLength            = 50
	MaxTeamMembers          = 5
	MaxTeamMemberNameLength = 100
	MaxURLLength            = 500
	MaxGalleryURLs          = 10
	MaxSalary               = 9999 // 万円
)

// validStatuses mirrors the JobPostingStatus union in the API spec.
var validStatuses = map[string]bool{
	"draft": true,
	"open":  true,
}

// Validate checks a fully-built posting right before persistence, so both the
// create and update paths share one rule set.
func Validate(j *JobPosting) error {
	if strings.TrimSpace(j.Title) == "" {
		return domainerr.NewValidation("求人タイトルは必須です")
	}
	if err := maxRunes("title", j.Title, MaxTitleLength); err != nil {
		return err
	}
	if err := maxRunes("description", j.Description, MaxDescriptionLength); err != nil {
		return err
	}
	if err := maxRunes("employmentType", j.EmploymentType, MaxEmploymentTypeLength); err != nil {
		return err
	}
	if j.Location != nil {
		if err := maxRunes("location", *j.Location, MaxLocationLength); err != nil {
			return err
		}
	}
	if !validStatuses[j.Status] {
		return domainerr.NewValidation("status は draft か open のいずれかです")
	}
	if err := maxRunes("jobCategory", j.JobCategory, MaxJobCategoryLength); err != nil {
		return err
	}
	if err := maxRunes("hiringCount", j.HiringCount, MaxHiringCountLength); err != nil {
		return err
	}

	for _, f := range []struct {
		name  string
		value string
	}{
		{"appealPoints", j.AppealPoints},
		{"challenges", j.Challenges},
		{"teamDescription", j.TeamDescription},
		{"skillsGained", j.SkillsGained},
		{"requiredQualifications", j.RequiredQualifications},
		{"preferredQualifications", j.PreferredQualifications},
		{"salaryDetail", j.SalaryDetail},
		{"benefits", j.Benefits},
		{"selectionProcess", j.SelectionProcess},
	} {
		if err := maxRunes(f.name, f.value, MaxLongTextLength); err != nil {
			return err
		}
	}

	for _, f := range []struct {
		name  string
		value string
	}{
		{"workLocation", j.WorkLocation},
		{"holidays", j.Holidays},
		{"insurance", j.Insurance},
	} {
		if err := maxRunes(f.name, f.value, MaxMediumTextLength); err != nil {
			return err
		}
	}

	for _, f := range []struct {
		name  string
		value string
	}{
		{"workLocationChangeScope", j.WorkLocationChangeScope},
		{"jobDescriptionChangeScope", j.JobDescriptionChangeScope},
		{"contractType", j.ContractType},
		{"probationPeriod", j.ProbationPeriod},
		{"workHours", j.WorkHours},
		{"breakTime", j.BreakTime},
		{"remotePolicy", j.RemotePolicy},
		{"smokingPolicy", j.SmokingPolicy},
		{"teamLabel", j.TeamLabel},
	} {
		if err := maxRunes(f.name, f.value, MaxShortTextLength); err != nil {
			return err
		}
	}

	for _, f := range []struct {
		name  string
		value string
	}{
		{"highlightTitleRole", j.HighlightTitleRole},
		{"highlightTitleAppeal", j.HighlightTitleAppeal},
		{"highlightTitleChallenge", j.HighlightTitleChallenge},
		{"highlightTitleGrowth", j.HighlightTitleGrowth},
	} {
		if err := maxRunes(f.name, f.value, MaxHighlightTitleLength); err != nil {
			return err
		}
	}

	if len(j.Tags) > MaxTags {
		return domainerr.NewValidation("tags は最大 %d 件です", MaxTags)
	}
	for _, tag := range j.Tags {
		if strings.TrimSpace(tag) == "" {
			return domainerr.NewValidation("空のタグは指定できません")
		}
		if err := maxRunes("tag", tag, MaxTagLength); err != nil {
			return err
		}
	}

	if len(j.TeamMembers) > MaxTeamMembers {
		return domainerr.NewValidation("チームメンバーは最大 %d 人です", MaxTeamMembers)
	}
	for _, m := range j.TeamMembers {
		if strings.TrimSpace(m.Name) == "" {
			return domainerr.NewValidation("チームメンバーの名前は必須です")
		}
		if err := maxRunes("teamMember.name", m.Name, MaxTeamMemberNameLength); err != nil {
			return err
		}
		if err := maxRunes("teamMember.photoUrl", m.PhotoURL, MaxURLLength); err != nil {
			return err
		}
	}

	if err := maxRunes("coverImageUrl", j.CoverImageURL, MaxURLLength); err != nil {
		return err
	}
	if len(j.GalleryURLs) > MaxGalleryURLs {
		return domainerr.NewValidation("ギャラリー画像は最大 %d 件です", MaxGalleryURLs)
	}
	for _, u := range j.GalleryURLs {
		if err := maxRunes("galleryUrl", u, MaxURLLength); err != nil {
			return err
		}
	}

	return validateSalaryRange(j.SalaryMin, j.SalaryMax)
}

func validateSalaryRange(minSalary, maxSalary *int32) error {
	if minSalary != nil && (*minSalary < 0 || *minSalary > MaxSalary) {
		return domainerr.NewValidation("salaryMin は 0〜%d（万円）の範囲で指定してください", MaxSalary)
	}
	if maxSalary != nil && (*maxSalary < 0 || *maxSalary > MaxSalary) {
		return domainerr.NewValidation("salaryMax は 0〜%d（万円）の範囲で指定してください", MaxSalary)
	}
	if minSalary != nil && maxSalary != nil && *minSalary > *maxSalary {
		return domainerr.NewValidation("salaryMin は salaryMax 以下にしてください")
	}
	return nil
}

func maxRunes(name, value string, limit int) error {
	if len([]rune(value)) > limit {
		return domainerr.NewValidation("%s は %d 文字以下にしてください", name, limit)
	}
	return nil
}
