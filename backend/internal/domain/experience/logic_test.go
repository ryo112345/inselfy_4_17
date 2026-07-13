package experience_test

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/experience"
)

func TestValidateCreate(t *testing.T) {
	y := int16(time.Now().Year()) //nolint:gosec // G115: 西暦は int16 に収まる
	endY := y
	endM := int16(6)

	cases := []struct {
		name    string
		input   experience.CreateInput
		wantErr error
	}{
		{
			name: "current ok",
			input: experience.CreateInput{
				CompanyName: "Acme",
				Title:       "Engineer",
				StartYear:   2020,
				StartMonth:  4,
				IsCurrent:   true,
			},
		},
		{
			name: "ended ok",
			input: experience.CreateInput{
				CompanyName: "Acme",
				Title:       "Engineer",
				StartYear:   2020,
				StartMonth:  4,
				EndYear:     &endY,
				EndMonth:    &endM,
				IsCurrent:   false,
			},
		},
		{
			name:    "empty company",
			input:   experience.CreateInput{CompanyName: "", Title: "t", StartYear: 2020, StartMonth: 1, IsCurrent: true},
			wantErr: experience.ErrCompanyNameRequired,
		},
		{
			name:    "empty title",
			input:   experience.CreateInput{CompanyName: "c", Title: " ", StartYear: 2020, StartMonth: 1, IsCurrent: true},
			wantErr: experience.ErrTitleRequired,
		},
		{
			name: "current but has end",
			input: experience.CreateInput{
				CompanyName: "c", Title: "t",
				StartYear: 2020, StartMonth: 1,
				EndYear: &endY, EndMonth: &endM,
				IsCurrent: true,
			},
			wantErr: experience.ErrCurrentHasEnd,
		},
		{
			name: "ended missing end",
			input: experience.CreateInput{
				CompanyName: "c", Title: "t",
				StartYear: 2020, StartMonth: 1,
				IsCurrent: false,
			},
			wantErr: experience.ErrEndedMissingEnd,
		},
		{
			name: "end before start",
			input: experience.CreateInput{
				CompanyName: "c", Title: "t",
				StartYear: 2021, StartMonth: 4,
				EndYear: int16Ptr(2020), EndMonth: int16Ptr(3),
				IsCurrent: false,
			},
			wantErr: experience.ErrEndBeforeStart,
		},
		{
			name: "start year too old",
			input: experience.CreateInput{
				CompanyName: "c", Title: "t",
				StartYear: 1900, StartMonth: 1,
				IsCurrent: true,
			},
			wantErr: experience.ErrStartYearOutOfRange,
		},
		{
			name: "start month out",
			input: experience.CreateInput{
				CompanyName: "c", Title: "t",
				StartYear: 2020, StartMonth: 13,
				IsCurrent: true,
			},
			wantErr: experience.ErrStartMonthOutOfRange,
		},
		{
			name: "description too long",
			input: experience.CreateInput{
				CompanyName: "c", Title: "t",
				StartYear: 2020, StartMonth: 1,
				IsCurrent:   true,
				Description: strings.Repeat("a", 5001),
			},
			wantErr: experience.ErrDescriptionTooLong,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := experience.ValidateCreate(tc.input)
			if tc.wantErr == nil {
				if err != nil {
					t.Fatalf("got err %v, want nil", err)
				}
				return
			}
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("got %v, want %v", err, tc.wantErr)
			}
		})
	}
}

func int16Ptr(v int16) *int16 { return &v }
