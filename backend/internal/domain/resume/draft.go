package resume

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/education"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/domain/skill"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
)

// Limits specific to resume drafts. Field length caps reuse the user/skill
// domain constants so the draft can never exceed what the profile accepts.
const (
	MaxURLLength    = 500
	MaxExperiences  = 50
	MaxEducations   = 20
	MinYear         = 1950
	monthDateLayout = "2006-01"
	fullDateLayout  = "2006-01-02"
)

// Draft is the profile draft an admin builds from the uploaded PDF.
// The JSON shape (snake_case, `start_date` alternatives, etc.) is the
// workflow contract documented in CLAUDE.md — error messages emitted here
// are matched verbatim by the operator tooling, so change them in lockstep.
type Draft struct {
	Headline    *string           `json:"headline"`
	About       *string           `json:"about"`
	Location    *string           `json:"location"`
	Industry    *string           `json:"industry"`
	URL         *string           `json:"url"`
	Experiences []DraftExperience `json:"experiences"`
	Educations  []DraftEducation  `json:"educations"`
	SkillNames  []string          `json:"skill_names"`
}

// DraftExperience mirrors experience.CreateInput plus the date-string
// alternatives accepted by the workflow (`start_date: "YYYY-MM"`).
type DraftExperience struct {
	CompanyName string  `json:"company_name"`
	Title       string  `json:"title"`
	StartYear   *int16  `json:"start_year"`
	StartMonth  *int16  `json:"start_month"`
	EndYear     *int16  `json:"end_year"`
	EndMonth    *int16  `json:"end_month"`
	StartDate   *string `json:"start_date"`
	EndDate     *string `json:"end_date"`
	IsCurrent   bool    `json:"is_current"`
	Description string  `json:"description"`
}

// DraftEducation mirrors education.CreateInput.
type DraftEducation struct {
	School    string  `json:"school"`
	Degree    *string `json:"degree"`
	StartYear *int16  `json:"start_year"`
	EndYear   *int16  `json:"end_year"`
}

// ParseDraft decodes and validates a draft payload. JSON decode errors are
// returned as-is (`json: unknown field ...` / `json: cannot unmarshal ...`)
// because the workflow documentation tells operators to act on those exact
// strings. Date-string alternatives are normalized into year/month before
// validation, so callers can persist the returned draft knowing every
// experience carries explicit start/end fields.
func ParseDraft(raw []byte) (*Draft, error) {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	var d Draft
	if err := dec.Decode(&d); err != nil {
		return nil, err
	}
	if err := d.normalize(); err != nil {
		return nil, err
	}
	if err := d.validate(); err != nil {
		return nil, err
	}
	return &d, nil
}

// normalize fills start/end year+month from the "YYYY-MM"(-DD) string
// alternatives when the explicit fields are absent.
func (d *Draft) normalize() error {
	for i := range d.Experiences {
		e := &d.Experiences[i]
		if e.StartDate != nil && e.StartYear == nil && e.StartMonth == nil {
			y, m, err := parseYearMonth(*e.StartDate)
			if err != nil {
				return fmt.Errorf("experience[%d]: start_date must be YYYY-MM or YYYY-MM-DD", i)
			}
			e.StartYear, e.StartMonth = &y, &m
		}
		if e.EndDate != nil && e.EndYear == nil && e.EndMonth == nil {
			y, m, err := parseYearMonth(*e.EndDate)
			if err != nil {
				return fmt.Errorf("experience[%d]: end_date must be YYYY-MM or YYYY-MM-DD", i)
			}
			e.EndYear, e.EndMonth = &y, &m
		}
	}
	return nil
}

func parseYearMonth(s string) (int16, int16, error) {
	layout := monthDateLayout
	if len(s) == len(fullDateLayout) {
		layout = fullDateLayout
	}
	t, err := time.Parse(layout, s)
	if err != nil {
		return 0, 0, err
	}
	return int16(t.Year()), int16(t.Month()), nil //nolint:gosec // year/month fit int16
}

func (d *Draft) validate() error {
	maxYear := time.Now().Year() + 1
	if err := user.ValidateHeadline(d.Headline); err != nil {
		return err
	}
	if err := user.ValidateAbout(d.About); err != nil {
		return err
	}
	if err := user.ValidateLocation(d.Location); err != nil {
		return err
	}
	if err := user.ValidateIndustry(d.Industry); err != nil {
		return err
	}
	if d.URL != nil && len([]rune(*d.URL)) > MaxURLLength {
		return fmt.Errorf("url must be %d characters or fewer", MaxURLLength)
	}
	if len(d.Experiences) > MaxExperiences {
		return fmt.Errorf("experiences are limited to %d entries", MaxExperiences)
	}
	if len(d.Educations) > MaxEducations {
		return fmt.Errorf("educations are limited to %d entries", MaxEducations)
	}
	if len(d.SkillNames) > skill.MaxPerUser {
		return fmt.Errorf("skill_names are limited to %d entries", skill.MaxPerUser)
	}
	for i := range d.Experiences {
		if err := d.Experiences[i].validate(i, maxYear); err != nil {
			return err
		}
	}
	for i, ed := range d.Educations {
		if strings.TrimSpace(ed.School) == "" {
			return fmt.Errorf("education[%d]: school is required", i)
		}
		for _, y := range []*int16{ed.StartYear, ed.EndYear} {
			if y != nil && (int(*y) < MinYear || int(*y) > maxYear) {
				return fmt.Errorf("education[%d]: year must be between %d and %d", i, MinYear, maxYear)
			}
		}
	}
	for i, name := range d.SkillNames {
		if strings.TrimSpace(name) == "" {
			return fmt.Errorf("skill[%d]: name is required", i)
		}
		if len([]rune(name)) > skill.MaxNameLength {
			return fmt.Errorf("skill[%d]: name must be %d characters or fewer", i, skill.MaxNameLength)
		}
	}
	return nil
}

func (e *DraftExperience) validate(i, maxYear int) error {
	if strings.TrimSpace(e.CompanyName) == "" {
		return fmt.Errorf("experience[%d]: company_name is required", i)
	}
	if strings.TrimSpace(e.Title) == "" {
		return fmt.Errorf("experience[%d]: title is required", i)
	}
	if e.StartYear == nil {
		return fmt.Errorf("experience[%d]: start_year is required", i)
	}
	if e.StartMonth == nil {
		return fmt.Errorf("experience[%d]: start_month is required", i)
	}
	if int(*e.StartYear) < MinYear || int(*e.StartYear) > maxYear {
		return fmt.Errorf("experience[%d]: start_year must be between %d and %d", i, MinYear, maxYear)
	}
	if *e.StartMonth < 1 || *e.StartMonth > 12 {
		return fmt.Errorf("experience[%d]: start_month must be between 1 and 12", i)
	}
	if e.IsCurrent {
		if e.EndYear != nil || e.EndMonth != nil {
			return fmt.Errorf("experience[%d]: end_year/end_month must be null when is_current is true", i)
		}
		return nil
	}
	if e.EndYear == nil || e.EndMonth == nil {
		return fmt.Errorf("experience[%d]: end_year and end_month are required when is_current is false", i)
	}
	if int(*e.EndYear) < MinYear || int(*e.EndYear) > maxYear {
		return fmt.Errorf("experience[%d]: end_year must be between %d and %d", i, MinYear, maxYear)
	}
	if *e.EndMonth < 1 || *e.EndMonth > 12 {
		return fmt.Errorf("experience[%d]: end_month must be between 1 and 12", i)
	}
	if int(*e.EndYear)*12+int(*e.EndMonth) < int(*e.StartYear)*12+int(*e.StartMonth) {
		return fmt.Errorf("experience[%d]: end date must not be before start date", i)
	}
	return nil
}

// ExperienceInputs converts the draft into experience.CreateInput values.
func (d *Draft) ExperienceInputs(userID string) []experience.CreateInput {
	inputs := make([]experience.CreateInput, 0, len(d.Experiences))
	for _, e := range d.Experiences {
		inputs = append(inputs, experience.CreateInput{
			UserID:      userID,
			CompanyName: strings.TrimSpace(e.CompanyName),
			Title:       strings.TrimSpace(e.Title),
			StartYear:   *e.StartYear,
			StartMonth:  *e.StartMonth,
			EndYear:     e.EndYear,
			EndMonth:    e.EndMonth,
			IsCurrent:   e.IsCurrent,
			Description: e.Description,
		})
	}
	return inputs
}

// EducationInputs converts the draft into education.CreateInput values.
func (d *Draft) EducationInputs(userID string) []education.CreateInput {
	inputs := make([]education.CreateInput, 0, len(d.Educations))
	for _, ed := range d.Educations {
		inputs = append(inputs, education.CreateInput{
			UserID:    userID,
			School:    strings.TrimSpace(ed.School),
			Degree:    ed.Degree,
			StartYear: ed.StartYear,
			EndYear:   ed.EndYear,
		})
	}
	return inputs
}
