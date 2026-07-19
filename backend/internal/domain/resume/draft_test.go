package resume

import (
	"fmt"
	"strings"
	"testing"
	"time"
)

func validDraftJSON() string {
	return `{
  "headline": "バックエンドエンジニア",
  "about": "Go と PostgreSQL を用いた API 開発に10年従事",
  "experiences": [
    {
      "company_name": "株式会社Acme",
      "title": "シニアエンジニア",
      "start_year": 2020,
      "start_month": 4,
      "end_year": null,
      "end_month": null,
      "is_current": true,
      "description": "決済基盤の設計・実装を主導。"
    },
    {
      "company_name": "前職株式会社",
      "title": "エンジニア",
      "start_date": "2015-04",
      "end_date": "2020-03",
      "is_current": false,
      "description": "受託開発チームで従事。"
    }
  ],
  "educations": [
    { "school": "東京大学", "degree": "工学部情報工学科", "start_year": 2011, "end_year": 2015 }
  ],
  "skill_names": ["Go", "PostgreSQL", "Docker"]
}`
}

func TestParseDraft_Valid(t *testing.T) {
	d, err := ParseDraft([]byte(validDraftJSON()))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// start_date "2015-04" must be decomposed into year/month.
	e := d.Experiences[1]
	if e.StartYear == nil || *e.StartYear != 2015 || e.StartMonth == nil || *e.StartMonth != 4 {
		t.Errorf("start_date not normalized: %+v", e)
	}
	if e.EndYear == nil || *e.EndYear != 2020 || e.EndMonth == nil || *e.EndMonth != 3 {
		t.Errorf("end_date not normalized: %+v", e)
	}
	if len(d.ExperienceInputs("u1")) != 2 || len(d.EducationInputs("u1")) != 1 {
		t.Errorf("input conversion mismatch")
	}
}

func TestParseDraft_FullDateLayout(t *testing.T) {
	raw := strings.Replace(validDraftJSON(), `"2015-04"`, `"2015-04-01"`, 1)
	d, err := ParseDraft([]byte(raw))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	e := d.Experiences[1]
	if e.StartYear == nil || *e.StartYear != 2015 || *e.StartMonth != 4 {
		t.Errorf("YYYY-MM-DD not normalized: %+v", e)
	}
}

// The exact message strings below are the operator-facing contract in
// CLAUDE.md's error-handling table. Do not change one without the other.
func TestParseDraft_ValidationMessages(t *testing.T) {
	maxYear := time.Now().Year() + 1
	cases := []struct {
		name string
		json string
		want string
	}{
		{
			name: "company_name required",
			json: `{"experiences":[{"company_name":"","title":"t","start_year":2020,"start_month":4,"is_current":true}]}`,
			want: "experience[0]: company_name is required",
		},
		{
			name: "title required",
			json: `{"experiences":[{"company_name":"c","title":" ","start_year":2020,"start_month":4,"is_current":true}]}`,
			want: "experience[0]: title is required",
		},
		{
			name: "start_year required",
			json: `{"experiences":[{"company_name":"c","title":"t","start_month":4,"is_current":true}]}`,
			want: "experience[0]: start_year is required",
		},
		{
			name: "start_month required",
			json: `{"experiences":[{"company_name":"c","title":"t","start_year":2020,"is_current":true}]}`,
			want: "experience[0]: start_month is required",
		},
		{
			name: "end required when not current",
			json: `{"experiences":[{"company_name":"c","title":"t","start_year":2020,"start_month":4,"is_current":false}]}`,
			want: "experience[0]: end_year and end_month are required when is_current is false",
		},
		{
			name: "end must be null when current",
			json: `{"experiences":[{"company_name":"c","title":"t","start_year":2020,"start_month":4,"end_year":2022,"end_month":3,"is_current":true}]}`,
			want: "experience[0]: end_year/end_month must be null when is_current is true",
		},
		{
			name: "end before start",
			json: `{"experiences":[{"company_name":"c","title":"t","start_year":2020,"start_month":4,"end_year":2020,"end_month":3,"is_current":false}]}`,
			want: "experience[0]: end date must not be before start date",
		},
		{
			name: "start_year out of range",
			json: `{"experiences":[{"company_name":"c","title":"t","start_year":1900,"start_month":4,"is_current":true}]}`,
			want: fmt.Sprintf("experience[0]: start_year must be between 1950 and %d", maxYear),
		},
		{
			name: "start_month out of range",
			json: `{"experiences":[{"company_name":"c","title":"t","start_year":2020,"start_month":13,"is_current":true}]}`,
			want: "experience[0]: start_month must be between 1 and 12",
		},
		{
			name: "second experience index",
			json: `{"experiences":[{"company_name":"c","title":"t","start_year":2020,"start_month":4,"is_current":true},{"company_name":"c2","title":"t2","start_month":4,"is_current":true}]}`,
			want: "experience[1]: start_year is required",
		},
		{
			name: "bad start_date format",
			json: `{"experiences":[{"company_name":"c","title":"t","start_date":"2020年4月","is_current":true}]}`,
			want: "experience[0]: start_date must be YYYY-MM or YYYY-MM-DD",
		},
		{
			name: "school required",
			json: `{"educations":[{"school":""}]}`,
			want: "education[0]: school is required",
		},
		{
			name: "empty skill name",
			json: `{"skill_names":["Go",""]}`,
			want: "skill[1]: name is required",
		},
		{
			name: "headline too long",
			json: fmt.Sprintf(`{"headline":%q}`, strings.Repeat("a", 256)),
			want: "headline must be 255 characters or fewer",
		},
		{
			name: "about too long",
			json: fmt.Sprintf(`{"about":%q}`, strings.Repeat("a", 2001)),
			want: "about must be 2000 characters or fewer",
		},
		{
			name: "url too long",
			json: fmt.Sprintf(`{"url":%q}`, strings.Repeat("a", 501)),
			want: "url must be 500 characters or fewer",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ParseDraft([]byte(tc.json))
			if err == nil {
				t.Fatalf("expected error %q, got nil", tc.want)
			}
			if err.Error() != tc.want {
				t.Errorf("message mismatch\n got: %s\nwant: %s", err.Error(), tc.want)
			}
		})
	}
}

func TestParseDraft_JSONDecodeErrors(t *testing.T) {
	cases := []struct {
		name     string
		json     string
		contains []string
	}{
		{
			name:     "unknown field",
			json:     `{"headlin":"typo"}`,
			contains: []string{"unknown field", "headlin"},
		},
		{
			name:     "string year",
			json:     `{"experiences":[{"company_name":"c","title":"t","start_year":"2020","start_month":4,"is_current":true}]}`,
			contains: []string{"cannot unmarshal", "int16"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ParseDraft([]byte(tc.json))
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			for _, s := range tc.contains {
				if !strings.Contains(err.Error(), s) {
					t.Errorf("error %q does not contain %q", err.Error(), s)
				}
			}
		})
	}
}

func TestParseDraft_CountLimits(t *testing.T) {
	exp := `{"company_name":"c","title":"t","start_year":2020,"start_month":4,"is_current":true}`
	many := strings.Repeat(exp+",", 50) + exp
	_, err := ParseDraft([]byte(`{"experiences":[` + many + `]}`))
	if err == nil || err.Error() != "experiences are limited to 50 entries" {
		t.Errorf("got %v", err)
	}
	skills := `"` + strings.Repeat(`s","`, 50) + `s"`
	_, err = ParseDraft([]byte(`{"skill_names":[` + skills + `]}`))
	if err == nil || err.Error() != "skill_names are limited to 50 entries" {
		t.Errorf("got %v", err)
	}
}
